"""Tests for GeminiLive tool scheduling and default tool fixes.

Covers:
- Bug 1: include_default_tools=False excludes weather tool
- Bug 2: Dict handler results with 'scheduling' key are respected
- Bug 3: String handler results still default to WHEN_IDLE
- Bug 3b: FlashWorker None guard for response.text
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.app.services.gemini_audio import GeminiLive


# ── Bug 1: include_default_tools parameter ───────────────────────


class TestIncludeDefaultTools:
    """include_default_tools controls whether weather tool is
    registered."""

    def test_default_includes_weather(self):
        """Default behavior (include_default_tools=True) includes
        weather tool."""
        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
        )

        tool_names = {
            fn["name"]
            for t in gl.tools
            for fn in t.get("function_declarations", [])
        }
        assert "get_weather" in tool_names
        assert "get_weather" in gl.tool_mapping

    def test_false_excludes_weather(self):
        """include_default_tools=False starts with no tools."""
        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
            include_default_tools=False,
        )

        tool_names = {
            fn["name"]
            for t in gl.tools
            for fn in t.get("function_declarations", [])
        }
        assert "get_weather" not in tool_names
        assert "get_weather" not in gl.tool_mapping

    def test_false_with_custom_tools_only_has_custom(self):
        """include_default_tools=False with custom tools only
        registers those custom tools."""
        custom_tools = [
            {
                "function_declarations": [
                    {
                        "name": "my_tool",
                        "description": "A custom tool",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        },
                    }
                ]
            }
        ]

        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
            tools=custom_tools,
            tool_mapping={"my_tool": lambda: "ok"},
            include_default_tools=False,
        )

        tool_names = {
            fn["name"]
            for t in gl.tools
            for fn in t.get("function_declarations", [])
        }
        assert tool_names == {"my_tool"}
        assert "my_tool" in gl.tool_mapping
        assert "get_weather" not in gl.tool_mapping

    def test_true_with_custom_tools_merges(self):
        """include_default_tools=True merges custom tools
        with weather."""
        custom_tools = [
            {
                "function_declarations": [
                    {
                        "name": "my_tool",
                        "description": "Custom",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        },
                    }
                ]
            }
        ]

        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
            tools=custom_tools,
            tool_mapping={"my_tool": lambda: "ok"},
            include_default_tools=True,
        )

        tool_names = {
            fn["name"]
            for t in gl.tools
            for fn in t.get("function_declarations", [])
        }
        assert "get_weather" in tool_names
        assert "my_tool" in tool_names
        assert "get_weather" in gl.tool_mapping
        assert "my_tool" in gl.tool_mapping


# ── Bug 2: Dict result scheduling is respected ───────────────────


@pytest.mark.asyncio
async def test_dict_result_scheduling_respected():
    """When a tool handler returns a dict with 'scheduling',
    that value is used in the FunctionResponse."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
        tools=[
            {
                "function_declarations": [
                    {
                        "name": "silent_tool",
                        "description": "Returns SILENT",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        },
                    }
                ]
            }
        ],
        tool_mapping={
            "silent_tool": lambda: {
                "result": "done quietly",
                "scheduling": "SILENT",
            }
        },
        include_default_tools=False,
    )

    # Create a mock session that yields a tool_call, then
    # captures the FunctionResponse sent back
    captured_responses = []

    mock_session = AsyncMock()

    mock_fc = MagicMock()
    mock_fc.name = "silent_tool"
    mock_fc.id = "call_123"
    mock_fc.args = {}

    mock_tool_call = MagicMock()
    mock_tool_call.function_calls = [mock_fc]

    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        yield MagicMock(
            server_content=None,
            tool_call=mock_tool_call,
            session_resumption_update=None,
        )

    mock_session.receive = mock_receive

    async def mock_send_tool_response(function_responses):
        captured_responses.extend(function_responses)

    mock_session.send_tool_response = mock_send_tool_response

    class MockCtxManager:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, *args):
            pass

    mock_live = MagicMock()
    mock_live.connect = lambda model, config: MockCtxManager()

    mock_client = MagicMock()
    mock_client.aio.live = mock_live
    gl.client = mock_client

    events = []
    try:
        async with asyncio.timeout(5):
            async for event in gl.start_session(
                audio_input_queue=asyncio.Queue(),
                video_input_queue=asyncio.Queue(),
                text_input_queue=asyncio.Queue(),
                audio_output_callback=AsyncMock(),
                audio_interrupt_callback=AsyncMock(),
            ):
                events.append(event)
    except (TimeoutError, Exception):
        pass

    assert len(captured_responses) == 1
    resp = captured_responses[0]
    assert resp.response["scheduling"] == "SILENT"
    assert resp.response["result"] == "done quietly"


@pytest.mark.asyncio
async def test_string_result_defaults_to_when_idle():
    """When a tool handler returns a plain string,
    scheduling defaults to WHEN_IDLE."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
        tools=[
            {
                "function_declarations": [
                    {
                        "name": "string_tool",
                        "description": "Returns a string",
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        },
                    }
                ]
            }
        ],
        tool_mapping={
            "string_tool": lambda: "plain string result"
        },
        include_default_tools=False,
    )

    captured_responses = []

    mock_session = AsyncMock()

    mock_fc = MagicMock()
    mock_fc.name = "string_tool"
    mock_fc.id = "call_456"
    mock_fc.args = {}

    mock_tool_call = MagicMock()
    mock_tool_call.function_calls = [mock_fc]

    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        yield MagicMock(
            server_content=None,
            tool_call=mock_tool_call,
            session_resumption_update=None,
        )

    mock_session.receive = mock_receive

    async def mock_send_tool_response(function_responses):
        captured_responses.extend(function_responses)

    mock_session.send_tool_response = mock_send_tool_response

    class MockCtxManager:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, *args):
            pass

    mock_live = MagicMock()
    mock_live.connect = lambda model, config: MockCtxManager()

    mock_client = MagicMock()
    mock_client.aio.live = mock_live
    gl.client = mock_client

    events = []
    try:
        async with asyncio.timeout(5):
            async for event in gl.start_session(
                audio_input_queue=asyncio.Queue(),
                video_input_queue=asyncio.Queue(),
                text_input_queue=asyncio.Queue(),
                audio_output_callback=AsyncMock(),
                audio_interrupt_callback=AsyncMock(),
            ):
                events.append(event)
    except (TimeoutError, Exception):
        pass

    assert len(captured_responses) == 1
    resp = captured_responses[0]
    assert resp.response["scheduling"] == "WHEN_IDLE"
    assert resp.response["result"] == "plain string result"


# ── Bug 3: FlashWorker None guard ────────────────────────────────


@pytest.mark.asyncio
async def test_generate_markdown_none_text_returns_empty():
    """FlashWorker.generate_markdown returns '' when
    response.text is None."""
    from unittest.mock import patch

    from src.app.services.flash_worker import FlashWorker

    with patch(
        "src.app.services.flash_worker.genai.Client"
    ) as MockClient:
        mock_generate = AsyncMock()
        mock_response = MagicMock()
        mock_response.text = None
        mock_generate.return_value = mock_response

        client_instance = MagicMock()
        client_instance.aio.models.generate_content = (
            mock_generate
        )
        MockClient.return_value = client_instance

        worker = FlashWorker(api_key="test")
        result = await worker.generate_markdown(
            title="Test", raw_ideas="ideas"
        )

    assert result == ""


@pytest.mark.asyncio
async def test_delegate_task_none_text_returns_empty():
    """FlashWorker.delegate_task returns '' when
    response.text is None."""
    from unittest.mock import patch

    from src.app.services.flash_worker import FlashWorker

    with patch(
        "src.app.services.flash_worker.genai.Client"
    ) as MockClient:
        mock_generate = AsyncMock()
        mock_response = MagicMock()
        mock_response.text = None
        mock_generate.return_value = mock_response

        client_instance = MagicMock()
        client_instance.aio.models.generate_content = (
            mock_generate
        )
        MockClient.return_value = client_instance

        worker = FlashWorker(api_key="test")
        result = await worker.delegate_task(
            task="Analyze", context="Context"
        )

    assert result == ""


@pytest.mark.asyncio
async def test_generate_image_empty_candidates_raises():
    """FlashWorker.generate_image raises ValueError when
    candidates list is empty."""
    from unittest.mock import patch

    from src.app.services.flash_worker import FlashWorker

    with patch(
        "src.app.services.flash_worker.genai.Client"
    ) as MockClient:
        mock_generate = AsyncMock()
        mock_response = MagicMock()
        mock_response.candidates = []
        mock_generate.return_value = mock_response

        client_instance = MagicMock()
        client_instance.aio.models.generate_content = (
            mock_generate
        )
        MockClient.return_value = client_instance

        worker = FlashWorker(api_key="test")
        with pytest.raises(
            ValueError, match="No candidates"
        ):
            await worker.generate_image(prompt="test")


# ── Brainstorm endpoint uses include_default_tools=False ─────────


@pytest.mark.asyncio
async def test_brainstorm_endpoint_excludes_default_tools():
    """Brainstorm endpoint passes include_default_tools=False
    to GeminiLive, so weather tool is not registered."""
    import time
    from unittest.mock import patch

    from fastapi.testclient import TestClient

    from src.app.main import app

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.brainstorm.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.brainstorm.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/brainstorm"
        ):
            time.sleep(0.5)

    call_kwargs = MockGeminiLive.call_args[1]
    assert call_kwargs["include_default_tools"] is False
