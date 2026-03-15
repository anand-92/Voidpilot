import asyncio
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.api.v1.endpoints.walkthrough import SYSTEM_PROMPT, router
from src.app.main import app
from src.app.services.gemini_audio import GeminiLive
from src.app.services.ws_manager import WebSocketManager


# ---------------------------------------------------------------------------
# Walkthrough system prompt and tool configuration
# ---------------------------------------------------------------------------


class TestWalkthroughSystemPrompt:
    def test_prompt_is_project_only(self):
        assert "Voidpilot" in SYSTEM_PROMPT

    def test_prompt_requires_search_tool(self):
        assert "search_project_context" in SYSTEM_PROMPT

    def test_prompt_redirects_off_topic(self):
        assert "unrelated" in SYSTEM_PROMPT.lower() or "redirect" in SYSTEM_PROMPT.lower()


class TestWalkthroughToolConfiguration:
    def test_walkthrough_uses_search_project_context_tool(self):
        from src.app.services.tool_defs import SEARCH_PROJECT_CONTEXT_TOOL_DEF

        declarations = SEARCH_PROJECT_CONTEXT_TOOL_DEF["function_declarations"]
        names = [d["name"] for d in declarations]
        assert "search_project_context" in names

    def test_walkthrough_does_not_include_brainstorm_tools(self):
        from src.app.services.tool_defs import SEARCH_PROJECT_CONTEXT_TOOL_DEF

        declarations = SEARCH_PROJECT_CONTEXT_TOOL_DEF["function_declarations"]
        names = [d["name"] for d in declarations]
        assert "save_brainstorm_artifact" not in names
        assert "generate_brainstorm_image" not in names
        assert "delegate_to_flash" not in names


# ---------------------------------------------------------------------------
# WebSocket connection and text input
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_accepts_connection():
    """Test that the walkthrough WebSocket endpoint accepts connections
    and forwards text messages to the Gemini session."""
    test_result = {"success": False, "error": None}

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            text_input_queue = kwargs.get("text_input_queue")
            try:
                data = await asyncio.wait_for(
                    text_input_queue.get(), timeout=2.0
                )
                if data == "hello voidpilot":
                    test_result["success"] = True
                else:
                    test_result["error"] = (
                        f"Expected 'hello voidpilot', got {data!r}"
                    )
            except TimeoutError:
                test_result["error"] = (
                    "Timeout waiting for text_input_queue.get()"
                )
            except Exception as e:
                test_result["error"] = str(e)
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        "type": "text",
                        "content": "hello voidpilot",
                    }
                )
            )
            time.sleep(2.5)

    assert test_result["success"] is True, test_result["error"]


@pytest.mark.asyncio
async def test_walkthrough_text_input_uses_live_session_path():
    """Typed walkthrough input enters the same live session text_input_queue
    as voice transcripts, not a separate side channel."""
    received_texts: list[str] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            text_input_queue = kwargs.get("text_input_queue")
            try:
                for _ in range(2):
                    data = await asyncio.wait_for(
                        text_input_queue.get(), timeout=3.0
                    )
                    received_texts.append(data)
            except TimeoutError:
                pass
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            websocket.send_text(
                json.dumps({"type": "text", "content": "first question"})
            )
            time.sleep(0.5)
            websocket.send_text(
                json.dumps({"type": "text", "content": "follow up"})
            )
            time.sleep(3.0)

    assert "first question" in received_texts
    assert "follow up" in received_texts


# ---------------------------------------------------------------------------
# Transcript event forwarding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_forwards_user_transcript_event():
    """The walkthrough endpoint forwards user transcript events to the
    client so the UI can render them as transcript turns."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {"type": "user", "text": "What is Voidpilot?"}
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            # Collect messages for a short window
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    # The manager should forward user transcripts as role-tagged text
    user_events = [
        e
        for e in received_events
        if e.get("type") == "text" and e.get("role") == "user"
    ]
    assert len(user_events) >= 1
    assert "What is Voidpilot?" in user_events[0].get("content", "")


@pytest.mark.asyncio
async def test_walkthrough_forwards_gemini_transcript_event():
    """The walkthrough endpoint forwards Gemini transcript events
    so the UI can render model responses as transcript turns."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {"type": "gemini", "text": "Voidpilot is a web assistant"}
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    gemini_events = [
        e
        for e in received_events
        if e.get("type") == "text" and e.get("role") == "gemini"
    ]
    assert len(gemini_events) >= 1
    assert "Voidpilot" in gemini_events[0].get("content", "")


# ---------------------------------------------------------------------------
# Tool activity lifecycle events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_surfaces_tool_activity_events():
    """Tool lifecycle events (tool_call_start, tool_call) are available for
    walkthrough grounding UI so users can see when project context is being
    fetched."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {
                "type": "tool_call_start",
                "name": "search_project_context",
            }
            yield {
                "type": "tool_call",
                "name": "search_project_context",
                "args": {"query": "websocket architecture"},
                "result": "The backend uses FastAPI...",
            }
            yield {
                "type": "gemini",
                "text": "Based on the project context...",
            }
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    # tool_call_start should be forwarded
    tool_start_events = [
        e for e in received_events if e.get("type") == "tool_call_start"
    ]
    assert len(tool_start_events) >= 1
    assert tool_start_events[0].get("name") == "search_project_context"

    # tool_call result should be forwarded
    tool_call_events = [
        e for e in received_events if e.get("type") == "tool_call"
    ]
    assert len(tool_call_events) >= 1
    assert tool_call_events[0].get("name") == "search_project_context"


# ---------------------------------------------------------------------------
# Interruption events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_forwards_interruption_event():
    """Interruption events are forwarded to the client so the UI can
    stop playback and clean up the interrupted transcript turn."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {"type": "gemini", "text": "Let me explain how..."}
            yield {"type": "interrupted"}
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    interrupted_events = [
        e for e in received_events if e.get("type") == "interrupted"
    ]
    assert len(interrupted_events) >= 1


# ---------------------------------------------------------------------------
# Error / degraded state events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_forwards_error_event():
    """Error events are forwarded so the frontend can surface degraded
    or error states instead of silently failing."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {
                "type": "error",
                "content": "Session connection lost",
                "error": "Session connection lost",
            }

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    error_events = [e for e in received_events if e.get("type") == "error"]
    assert len(error_events) >= 1
    assert "connection" in error_events[0].get("content", "").lower() or \
           "connection" in error_events[0].get("error", "").lower()


# ---------------------------------------------------------------------------
# WebSocketManager forwarding coverage
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ws_manager_forwards_tool_call_start():
    """WebSocketManager.forward_gemini_event forwards tool_call_start
    events so the walkthrough UI can show grounding activity."""
    mock_ws = AsyncMock()
    mock_ws.client_state = MagicMock()
    # Simulate CONNECTED state
    from starlette.websockets import WebSocketState

    mock_ws.client_state = WebSocketState.CONNECTED

    manager = WebSocketManager(mock_ws, "Test")
    event = {"type": "tool_call_start", "name": "search_project_context"}
    await manager.forward_gemini_event(event)

    mock_ws.send_json.assert_called_once_with(event)


@pytest.mark.asyncio
async def test_ws_manager_forwards_interrupted():
    """WebSocketManager.forward_gemini_event forwards interrupted events."""
    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState

    mock_ws.client_state = WebSocketState.CONNECTED

    manager = WebSocketManager(mock_ws, "Test")
    event = {"type": "interrupted"}
    await manager.forward_gemini_event(event)

    mock_ws.send_json.assert_called_once_with(event)


@pytest.mark.asyncio
async def test_ws_manager_forwards_error_with_content():
    """WebSocketManager.forward_gemini_event forwards error events
    preserving both content and error fields."""
    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState

    mock_ws.client_state = WebSocketState.CONNECTED

    manager = WebSocketManager(mock_ws, "Test")
    event = {
        "type": "error",
        "content": "Something went wrong",
        "error": "Something went wrong",
    }
    await manager.forward_gemini_event(event)

    mock_ws.send_json.assert_called_once_with(event)


@pytest.mark.asyncio
async def test_ws_manager_forwards_turn_complete():
    """WebSocketManager.forward_gemini_event forwards turn_complete events
    so the frontend knows when a response turn is finished."""
    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState

    mock_ws.client_state = WebSocketState.CONNECTED

    manager = WebSocketManager(mock_ws, "Test")
    event = {"type": "turn_complete"}
    await manager.forward_gemini_event(event)

    mock_ws.send_json.assert_called_once_with(event)


@pytest.mark.asyncio
async def test_ws_manager_forwards_generation_complete():
    """WebSocketManager.forward_gemini_event forwards generation_complete
    events so the frontend knows when Gemini finishes generating."""
    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState

    mock_ws.client_state = WebSocketState.CONNECTED

    manager = WebSocketManager(mock_ws, "Test")
    event = {"type": "generation_complete"}
    await manager.forward_gemini_event(event)

    mock_ws.send_json.assert_called_once_with(event)


# ---------------------------------------------------------------------------
# GeminiLive transcript sanitization for walkthrough events
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_gemini_live_enqueues_user_transcript_with_sanitization():
    """GeminiLive._enqueue_transcription sanitizes control tokens from
    user transcript text before forwarding."""
    gemini = GeminiLive(
        api_key="test-key", model="test-model", input_sample_rate=16000
    )
    event_queue: asyncio.Queue = asyncio.Queue()

    await gemini._enqueue_transcription(
        event_queue, "user", "Hello<ctrl23> world"
    )

    events: list[dict] = []
    while not event_queue.empty():
        events.append(await event_queue.get())

    assert len(events) == 1
    assert events[0]["type"] == "user"
    assert events[0]["text"] == "Hello world"


@pytest.mark.asyncio
async def test_gemini_live_enqueues_gemini_transcript_with_sanitization():
    """GeminiLive._enqueue_transcription sanitizes control tokens from
    Gemini transcript text and marks the turn as having output transcription."""
    gemini = GeminiLive(
        api_key="test-key", model="test-model", input_sample_rate=16000
    )
    event_queue: asyncio.Queue = asyncio.Queue()

    assert not gemini._saw_output_transcription_this_turn
    await gemini._enqueue_transcription(
        event_queue, "gemini", "Here is the answer<ctrl99>"
    )

    events: list[dict] = []
    while not event_queue.empty():
        events.append(await event_queue.get())

    assert len(events) == 1
    assert events[0]["type"] == "gemini"
    assert events[0]["text"] == "Here is the answer"
    assert gemini._saw_output_transcription_this_turn is True


@pytest.mark.asyncio
async def test_gemini_live_skips_empty_transcript_after_sanitization():
    """GeminiLive._enqueue_transcription skips transcripts that become
    empty after sanitization."""
    gemini = GeminiLive(
        api_key="test-key", model="test-model", input_sample_rate=16000
    )
    event_queue: asyncio.Queue = asyncio.Queue()

    await gemini._enqueue_transcription(
        event_queue, "user", "<ctrl46>  "
    )

    assert event_queue.empty()


# ---------------------------------------------------------------------------
# Tool call result forwarding preserves no-result content
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_walkthrough_tool_call_preserves_no_results_content():
    """The walkthrough endpoint forwards tool_call events with the raw
    result content so the frontend can detect no-result outcomes
    ('No results found.') and surface them honestly."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {
                "type": "tool_call_start",
                "name": "search_project_context",
            }
            yield {
                "type": "tool_call",
                "name": "search_project_context",
                "args": {"query": "nonexistent feature xyz"},
                "result": "No results found.",
            }
            yield {
                "type": "gemini",
                "text": "I couldn't find information about that.",
            }
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    # The tool_call result should be forwarded as-is
    tool_call_events = [
        e for e in received_events if e.get("type") == "tool_call"
    ]
    assert len(tool_call_events) >= 1
    assert tool_call_events[0].get("result") == "No results found."


@pytest.mark.asyncio
async def test_walkthrough_tool_call_preserves_error_result():
    """The walkthrough endpoint forwards tool_call events with error
    result content so the frontend can detect errors and surface
    them honestly instead of showing 'Project context retrieved'."""
    received_events: list[dict] = []

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {
                "type": "tool_call_start",
                "name": "search_project_context",
            }
            yield {
                "type": "tool_call",
                "name": "search_project_context",
                "args": {"query": "test"},
                "result": "Error: Service temporarily unavailable",
            }
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            end_time = time.time() + 3.0
            while time.time() < end_time:
                try:
                    data = websocket.receive_json(mode="text")
                    received_events.append(data)
                except Exception:
                    break

    # The tool_call result should be forwarded as-is
    tool_call_events = [
        e for e in received_events if e.get("type") == "tool_call"
    ]
    assert len(tool_call_events) >= 1
    assert "Error:" in str(tool_call_events[0].get("result", ""))
