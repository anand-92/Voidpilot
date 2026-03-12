import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.api.v1.endpoints.brainstorm import (
    BRAINSTORM_SYSTEM_PROMPT,
)
from src.app.services.tool_defs import (
    BRAINSTORM_TOOLS,
    DELEGATE_TOOL_DEF,
    IMAGE_TOOL_DEF,
    SAVE_ARTIFACT_TOOL_DEF,
)
from src.app.services.flash_worker import FLASH_MODEL
from src.app.main import app


# ── Tool declaration tests ───────────────────────────────────────


class TestToolDeclarations:
    """Verify all three brainstorm tool declarations."""

    def test_save_artifact_is_non_blocking(self):
        """BE-TH-01: save_brainstorm_artifact has
        behavior='NON_BLOCKING'."""
        assert SAVE_ARTIFACT_TOOL_DEF["behavior"] == "NON_BLOCKING"
        assert (
            SAVE_ARTIFACT_TOOL_DEF["name"]
            == "save_brainstorm_artifact"
        )

    def test_save_artifact_params(self):
        """save_brainstorm_artifact has title, raw_ideas, filename
        — all required."""
        params = SAVE_ARTIFACT_TOOL_DEF["parameters"]
        props = params["properties"]
        assert "title" in props
        assert "raw_ideas" in props
        assert "filename" in props
        assert props["title"]["type"] == "string"
        assert props["raw_ideas"]["type"] == "string"
        assert props["filename"]["type"] == "string"
        assert set(params["required"]) == {
            "title",
            "raw_ideas",
            "filename",
        }

    def test_image_tool_is_non_blocking(self):
        """BE-TH-02: generate_brainstorm_image has
        behavior='NON_BLOCKING'."""
        assert IMAGE_TOOL_DEF["behavior"] == "NON_BLOCKING"
        assert (
            IMAGE_TOOL_DEF["name"] == "generate_brainstorm_image"
        )

    def test_image_tool_params(self):
        """generate_brainstorm_image has prompt and label
        — both required."""
        params = IMAGE_TOOL_DEF["parameters"]
        props = params["properties"]
        assert "prompt" in props
        assert "label" in props
        assert props["prompt"]["type"] == "string"
        assert props["label"]["type"] == "string"
        assert set(params["required"]) == {"prompt", "label"}

    def test_delegate_tool_is_non_blocking(self):
        """BE-TH-03: delegate_to_flash has
        behavior='NON_BLOCKING'."""
        assert DELEGATE_TOOL_DEF["behavior"] == "NON_BLOCKING"
        assert DELEGATE_TOOL_DEF["name"] == "delegate_to_flash"

    def test_delegate_tool_params(self):
        """delegate_to_flash has task (required), context (required),
        output_format (optional with enum)."""
        params = DELEGATE_TOOL_DEF["parameters"]
        props = params["properties"]
        assert "task" in props
        assert "context" in props
        assert "output_format" in props
        assert props["task"]["type"] == "string"
        assert props["context"]["type"] == "string"
        assert props["output_format"]["enum"] == [
            "markdown_section",
            "json",
            "summary",
        ]
        assert set(params["required"]) == {"task", "context"}

    def test_brainstorm_tools_has_all_four(self):
        """BRAINSTORM_TOOLS contains the four brainstorm
        tool declarations."""
        decls = BRAINSTORM_TOOLS[0]["function_declarations"]
        names = {d["name"] for d in decls}
        assert names == {
            "save_brainstorm_artifact",
            "generate_brainstorm_image",
            "generate_brainstorm_video",
            "delegate_to_flash",
        }
        assert len(decls) == 4


# ── System prompt test ───────────────────────────────────────────


class TestSystemPrompt:
    """BE-WS-02: Verify brainstorm system prompt content."""

    def test_prompt_is_creative_partner(self):
        assert "creative thinking partner" in BRAINSTORM_SYSTEM_PROMPT

    def test_prompt_mentions_brainstorm_mode(self):
        assert "Brainstorm Mode" in BRAINSTORM_SYSTEM_PROMPT

    def test_prompt_mentions_save_artifact(self):
        assert (
            "save_brainstorm_artifact" in BRAINSTORM_SYSTEM_PROMPT
        )

    def test_prompt_mentions_generate_image(self):
        assert (
            "generate_brainstorm_image" in BRAINSTORM_SYSTEM_PROMPT
        )

    def test_prompt_mentions_delegate(self):
        assert "delegate_to_flash" in BRAINSTORM_SYSTEM_PROMPT

    def test_prompt_no_pause_instruction(self):
        assert (
            "do NOT pause the conversation"
            in BRAINSTORM_SYSTEM_PROMPT
        )


# ── Tool handler scheduling tests ────────────────────────────────


@pytest.mark.asyncio
async def test_save_handler_returns_silent():
    """BE-TH-04: save_brainstorm_artifact handler returns
    scheduling='SILENT'."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.generate_markdown.return_value = "# Ideas"
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        result = await handlers["save_brainstorm_artifact"](
            title="Test",
            raw_ideas="idea one",
            filename="test.md",
        )

    assert result["scheduling"] == "SILENT"
    assert "result" in result


@pytest.mark.asyncio
async def test_image_handler_returns_when_idle():
    """BE-TH-05: generate_brainstorm_image handler returns
    scheduling='WHEN_IDLE'."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.generate_image.return_value = b"\x89PNGfakedata"
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        result = await handlers["generate_brainstorm_image"](
            prompt="a cat",
            label="Cat Sketch",
        )

    assert result["scheduling"] == "WHEN_IDLE"
    assert "result" in result


@pytest.mark.asyncio
async def test_delegate_handler_returns_when_idle():
    """BE-TH-06: delegate_to_flash handler returns
    scheduling='WHEN_IDLE'."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.delegate_task.return_value = "## Analysis\nDone."
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        result = await handlers["delegate_to_flash"](
            task="Analyze trends",
            context="SaaS product",
        )

    assert result["scheduling"] == "WHEN_IDLE"
    assert "result" in result


@pytest.mark.asyncio
async def test_make_tool_handlers_uses_selected_flash_model():
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        'src.app.api.v1.endpoints.brainstorm.FlashWorker'
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.delegate_task.return_value = 'Done'
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(
            mock_ws, 'test_key', text_model_key='gemini-3-flash'
        )
        await handlers['delegate_to_flash'](
            task='Analyze trends',
            context='SaaS product',
        )

    MockFW.assert_called_once_with(
        api_key='test_key', text_model_key='gemini-3-flash'
    )


# ── WebSocket artifact push tests ────────────────────────────────


@pytest.mark.asyncio
async def test_save_handler_pushes_artifact_via_websocket():
    """BE-TH-07: save handler sends brainstorm_artifact
    message via WebSocket."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.generate_markdown.return_value = "# Structured"
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        await handlers["save_brainstorm_artifact"](
            title="Ideas",
            raw_ideas="raw",
            filename="ideas.md",
        )

    mock_ws.send_json.assert_called_once_with(
        {
            "type": "brainstorm_artifact",
            "filename": "ideas.md",
            "content": "# Structured",
        }
    )


@pytest.mark.asyncio
async def test_image_handler_pushes_image_via_websocket():
    """BE-TH-07: image handler sends brainstorm_image
    message with base64 data via WebSocket."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED
    image_bytes = b"\x89PNGfakedata"

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.generate_image.return_value = image_bytes
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        await handlers["generate_brainstorm_image"](
            prompt="a cat",
            label="Cat Sketch",
        )

    import base64

    expected_b64 = base64.b64encode(image_bytes).decode("utf-8")
    mock_ws.send_json.assert_called_once_with(
        {
            "type": "brainstorm_image",
            "filename": "cat_sketch.png",
            "label": "Cat Sketch",
            "data": expected_b64,
        }
    )


@pytest.mark.asyncio
async def test_delegate_handler_pushes_artifact_via_websocket():
    """BE-TH-07: delegate handler sends brainstorm_artifact
    message via WebSocket."""
    from src.app.api.v1.endpoints.brainstorm import (
        _make_tool_handlers,
    )

    mock_ws = AsyncMock()
    from starlette.websockets import WebSocketState
    mock_ws.client_state = WebSocketState.CONNECTED

    with patch(
        "src.app.api.v1.endpoints.brainstorm.FlashWorker"
    ) as MockFW:
        mock_fw = AsyncMock()
        mock_fw.delegate_task.return_value = "## Result"
        MockFW.return_value = mock_fw

        handlers = _make_tool_handlers(mock_ws, "test_key")
        await handlers["delegate_to_flash"](
            task="Analyze trends",
            context="SaaS product",
            output_format="summary",
        )

    call_args = mock_ws.send_json.call_args[0][0]
    assert call_args["type"] == "brainstorm_artifact"
    assert call_args["content"] == "## Result"
    assert call_args["filename"].endswith(".md")


# ── WebSocket endpoint tests ─────────────────────────────────────


@pytest.mark.asyncio
async def test_brainstorm_websocket_accepts_connection():
    """BE-WS-01: Brainstorm WebSocket endpoint exists and accepts
    connections at /api/v1/live/brainstorm."""
    test_result = {"success": False, "error": None}

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
            text_input_queue = kwargs.get("text_input_queue")
            try:
                data = await asyncio.wait_for(
                    text_input_queue.get(), timeout=2.0
                )
                if data == "brainstorm test":
                    test_result["success"] = True
                else:
                    test_result["error"] = (
                        f"Expected 'brainstorm test', got {data!r}"
                    )
            except TimeoutError:
                test_result["error"] = "Timeout waiting for text"
            except Exception as e:
                test_result["error"] = str(e)
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/brainstorm"
        ) as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        "type": "text",
                        "content": "brainstorm test",
                    }
                )
            )
            time.sleep(2.5)

    assert test_result["success"] is True, test_result["error"]


@pytest.mark.asyncio
async def test_brainstorm_uses_brainstorm_system_prompt():
    """BE-WS-02: GeminiLive is created with the brainstorm
    system prompt."""
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
    assert "creative thinking partner" in call_kwargs[
        "system_prompt"
    ]
    assert "Brainstorm Mode" in call_kwargs["system_prompt"]


@pytest.mark.asyncio
async def test_brainstorm_registers_only_brainstorm_tools():
    """BE-WS-03: Only brainstorm tools are registered —
    no weather, midscene, or bash tools."""
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
    tools = call_kwargs["tools"]

    # Collect all tool names from the declarations
    tool_names = set()
    for tool_group in tools:
        for decl in tool_group.get("function_declarations", []):
            tool_names.add(decl["name"])

    # Only brainstorm tools should be present
    assert tool_names == {
        "save_brainstorm_artifact",
        "generate_brainstorm_image",
        "generate_brainstorm_video",
        "delegate_to_flash",
    }

    # Verify tool_mapping matches
    tool_mapping = call_kwargs["tool_mapping"]
    assert set(tool_mapping.keys()) == {
        "save_brainstorm_artifact",
        "generate_brainstorm_image",
        "generate_brainstorm_video",
        "delegate_to_flash",
    }


@pytest.mark.asyncio
async def test_brainstorm_session_config_selects_flash_model():
    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = 'test_key'

    with (
        patch('src.app.api.v1.endpoints.brainstorm.settings', mock_settings),
        patch('src.app.api.v1.endpoints.brainstorm.GeminiLive') as MockGeminiLive,
        patch('src.app.api.v1.endpoints.brainstorm.FlashWorker') as MockFlashWorker,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            yield {'type': 'turn_complete'}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect('/api/v1/live/brainstorm') as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        'type': 'session_config',
                        'flash_model': 'gemini-3-flash',
                    }
                )
            )
            time.sleep(0.5)

    assert MockFlashWorker.call_count >= 2
    assert MockFlashWorker.call_args.kwargs == {
        'api_key': 'test_key',
        'text_model_key': 'gemini-3-flash',
    }


@pytest.mark.asyncio
async def test_brainstorm_session_resumption_config():
    """BE-WS-04: Brainstorm endpoint handles session_config
    messages for resumption."""
    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    config_received = {"handle": None}

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
        ) as websocket:
            # Send a session_config message with a resumption handle
            websocket.send_text(
                json.dumps(
                    {
                        "type": "session_config",
                        "handle": "test_resumption_handle_123",
                    }
                )
            )
            time.sleep(1.0)

    # The endpoint should have accepted the connection
    # and processed the session_config message without error
    assert MockGeminiLive.called
