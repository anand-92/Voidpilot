"""Tests for session resumption support in GeminiLive."""

import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from google.genai import types

from src.app.main import app
from src.app.services.gemini_audio import GeminiLive, build_live_history_turns

# ── BE-SR-01: GeminiLive accepts session_resumption_handle ───────


class TestGeminiLiveSessionResumptionParam:
    """BE-SR-01: GeminiLive accepts session_resumption_handle."""

    def test_default_handle_is_none(self):
        """session_resumption_handle defaults to None."""
        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
        )
        assert gl.session_resumption_handle is None

    def test_handle_stored_when_provided(self):
        """session_resumption_handle is stored on the instance."""
        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
            session_resumption_handle="abc123",
        )
        assert gl.session_resumption_handle == "abc123"

    def test_handle_can_be_set_after_init(self):
        """session_resumption_handle can be set after
        construction (brainstorm endpoint use case)."""
        gl = GeminiLive(
            api_key="test",
            model="test-model",
            input_sample_rate=16000,
        )
        gl.session_resumption_handle = "new_handle_456"
        assert gl.session_resumption_handle == "new_handle_456"

    def test_existing_params_still_work(self):
        """Existing constructor params still work without
        session_resumption_handle."""
        gl = GeminiLive(
            api_key="test_key",
            model="test-model",
            input_sample_rate=16000,
            tools=[{"function_declarations": []}],
            tool_mapping={"test": lambda: None},
            system_prompt="custom prompt",
        )
        assert gl.api_key == "test_key"
        assert gl.model == "test-model"
        assert gl.system_prompt == "custom prompt"
        assert gl.session_resumption_handle is None


# ── BE-SR-02: SessionResumptionConfig in LiveConnectConfig ───────


@pytest.mark.asyncio
async def test_session_resumption_config_with_handle():
    """BE-SR-02: LiveConnectConfig includes
    SessionResumptionConfig when handle is provided."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
        session_resumption_handle="resume_handle_xyz",
    )

    captured_config = {}

    mock_session = AsyncMock()
    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            # On second call, raise to end the session
            raise Exception("Session ended")
        # Empty receive — ends immediately
        return
        yield  # make it an async generator

    mock_session.receive = mock_receive

    class MockCtxManager:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, *args):
            pass

    def connect_fn(model, config):
        captured_config["config"] = config
        return MockCtxManager()

    mock_live = MagicMock()
    mock_live.connect = connect_fn

    mock_client = MagicMock()
    mock_client.aio.live = mock_live
    gl.client = mock_client

    # Collect events with a timeout to prevent hanging
    try:
        async with asyncio.timeout(5):
            async for _ in gl.start_session(
                audio_input_queue=asyncio.Queue(),
                video_input_queue=asyncio.Queue(),
                text_input_queue=asyncio.Queue(),
                audio_output_callback=AsyncMock(),
                audio_interrupt_callback=AsyncMock(),
            ):
                pass
    except (TimeoutError, Exception):
        pass

    config = captured_config["config"]
    assert config.session_resumption is not None
    assert isinstance(
        config.session_resumption,
        types.SessionResumptionConfig,
    )
    assert config.session_resumption.handle == "resume_handle_xyz"


@pytest.mark.asyncio
async def test_session_resumption_config_none_handle():
    """BE-SR-02: When handle is None, SessionResumptionConfig
    is still present with handle=None (fresh session)."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )

    captured_config = {}

    mock_session = AsyncMock()
    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        return
        yield

    mock_session.receive = mock_receive

    class MockCtxManager:
        async def __aenter__(self):
            return mock_session

        async def __aexit__(self, *args):
            pass

    def connect_fn(model, config):
        captured_config["config"] = config
        return MockCtxManager()

    mock_live = MagicMock()
    mock_live.connect = connect_fn

    mock_client = MagicMock()
    mock_client.aio.live = mock_live
    gl.client = mock_client

    try:
        async with asyncio.timeout(5):
            async for _ in gl.start_session(
                audio_input_queue=asyncio.Queue(),
                video_input_queue=asyncio.Queue(),
                text_input_queue=asyncio.Queue(),
                audio_output_callback=AsyncMock(),
                audio_interrupt_callback=AsyncMock(),
            ):
                pass
    except (TimeoutError, Exception):
        pass

    config = captured_config["config"]
    assert config.session_resumption is not None
    assert config.session_resumption.handle is None


# ── BE-SR-03: session_resumption_update events yielded ───────────


@pytest.mark.asyncio
async def test_session_resumption_update_yielded():
    """BE-SR-03: session_resumption_update events from Gemini
    are yielded with type, handle, and resumable."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )

    mock_session = AsyncMock()

    mock_update = MagicMock()
    mock_update.resumable = True
    mock_update.new_handle = "new_handle_from_gemini"

    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        yield MagicMock(
            server_content=None,
            tool_call=None,
            session_resumption_update=mock_update,
        )

    mock_session.receive = mock_receive

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
                if event.get("type") == "session_resumption_update":
                    break
    except (TimeoutError, Exception):
        pass

    resumption_events = [
        e
        for e in events
        if e.get("type") == "session_resumption_update"
    ]
    assert len(resumption_events) == 1
    assert (
        resumption_events[0]["handle"] == "new_handle_from_gemini"
    )
    assert resumption_events[0]["resumable"] is True


@pytest.mark.asyncio
async def test_session_resumption_update_not_yielded_when_not_resumable():
    """session_resumption_update is NOT yielded when
    update.resumable is False."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )

    mock_session = AsyncMock()

    mock_update = MagicMock()
    mock_update.resumable = False
    mock_update.new_handle = "some_handle"

    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        yield MagicMock(
            server_content=None,
            tool_call=None,
            session_resumption_update=mock_update,
        )

    mock_session.receive = mock_receive

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

    resumption_events = [
        e
        for e in events
        if e.get("type") == "session_resumption_update"
    ]
    assert len(resumption_events) == 0


# ── Brainstorm endpoint session_config handling ──────────────────


@pytest.mark.asyncio
async def test_brainstorm_session_config_sets_handle():
    """Brainstorm endpoint sets session_resumption_handle
    on GeminiLive when session_config message arrives."""
    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    captured_instance = {"inst": None}

    with (
        patch(
            "src.app.api.v1.endpoints.brainstorm.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.brainstorm.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = MagicMock()
        mock_gemini_instance.session_resumption_handle = None

        async def mock_start_session(*args, **kwargs):
            # Give time for session_config message to arrive
            await asyncio.sleep(1.0)
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        def capture_constructor(*a, **kw):
            captured_instance["inst"] = mock_gemini_instance
            return mock_gemini_instance

        MockGeminiLive.side_effect = capture_constructor

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/brainstorm"
        ) as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        "type": "session_config",
                        "handle": "test_handle_from_client",
                    }
                )
            )
            time.sleep(2.5)

    assert (
        captured_instance["inst"].session_resumption_handle
        == "test_handle_from_client"
    )


@pytest.mark.asyncio
async def test_brainstorm_session_config_sets_history_and_disables_resume_autostart():
    """Resumed brainstorm sessions seed recent transcript and skip Creative Spark warmup."""
    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    captured_instance = {"inst": None}

    with (
        patch(
            "src.app.api.v1.endpoints.brainstorm.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.brainstorm.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = MagicMock()
        mock_gemini_instance.history_turns = []
        mock_gemini_instance.auto_start = True

        async def mock_start_session(*args, **kwargs):
            await asyncio.sleep(1.0)
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        def capture_constructor(*a, **kw):
            captured_instance["inst"] = mock_gemini_instance
            return mock_gemini_instance

        MockGeminiLive.side_effect = capture_constructor

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/brainstorm"
        ) as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        "type": "session_config",
                        "brainstorm_type": "creative_spark",
                        "conversation_history": [
                            {"role": "user_voice", "content": "Sketch a dragon"},
                            {"role": "gemini_voice", "content": "Want it cinematic?"},
                        ],
                    }
                )
            )
            time.sleep(2.5)

    assert len(captured_instance["inst"].history_turns) == 2
    assert captured_instance["inst"].auto_start is False


@pytest.mark.asyncio
async def test_brainstorm_forwards_resumption_events():
    """Brainstorm endpoint forwards session_resumption_update
    events to client via websocket."""
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
            yield {
                "type": "session_resumption_update",
                "handle": "new_handle_abc",
                "resumable": True,
            }
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/brainstorm"
        ) as websocket:
            time.sleep(1.0)
            data = websocket.receive_json()

    assert data["type"] == "session_resumption_update"
    assert data["handle"] == "new_handle_abc"
    assert data["resumable"] is True


@pytest.mark.asyncio
async def test_go_away_event_yielded():
    """GoAway messages are yielded so callers can reconnect."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )

    mock_session = AsyncMock()

    mock_go_away = MagicMock()
    mock_go_away.time_left = "60s"

    call_count = 0

    async def mock_receive():
        nonlocal call_count
        call_count += 1
        if call_count > 1:
            raise Exception("Session ended")
        yield MagicMock(
            server_content=None,
            tool_call=None,
            go_away=mock_go_away,
            session_resumption_update=None,
        )

    mock_session.receive = mock_receive

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
                if event.get("type") == "go_away":
                    break
    except (TimeoutError, Exception):
        pass

    assert {"type": "go_away", "time_left": "60s"} in events


@pytest.mark.asyncio
async def test_handle_receive_error_uses_content_field():
    """Recoverable errors include content for websocket clients."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )
    event_queue: asyncio.Queue = asyncio.Queue()

    await gl._handle_receive_error(Exception("temporary failure"), event_queue)

    event = await event_queue.get()
    assert event == {
        "type": "error",
        "content": "temporary failure",
        "error": "temporary failure",
    }


@pytest.mark.asyncio
async def test_start_session_sends_history_turns_for_fresh_resume():
    """Saved transcript history is injected only for fresh sessions."""
    history_turns = build_live_history_turns(
        [
            {"role": "user_voice", "content": "Hello there"},
            {"role": "gemini_voice", "content": "Hi!"},
        ]
    )
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
        history_turns=history_turns,
    )

    mock_session = AsyncMock()

    async def mock_receive():
        if False:
            yield

    mock_session.receive = mock_receive

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

    async with asyncio.timeout(5):
        async for _ in gl.start_session(
            audio_input_queue=asyncio.Queue(),
            video_input_queue=asyncio.Queue(),
            text_input_queue=asyncio.Queue(),
            audio_output_callback=AsyncMock(),
            audio_interrupt_callback=AsyncMock(),
        ):
            pass

    mock_session.send_client_content.assert_awaited_once_with(
        turns=history_turns,
        turn_complete=False,
    )


@pytest.mark.asyncio
async def test_start_session_skips_history_turns_when_resumption_handle_exists():
    """Server-side resumption should not duplicate restored transcript turns."""
    history_turns = build_live_history_turns(
        [
            {"role": "user_voice", "content": "Hello there"},
            {"role": "gemini_voice", "content": "Hi!"},
        ]
    )
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
        session_resumption_handle="resume-handle",
        history_turns=history_turns,
    )

    mock_session = AsyncMock()

    async def mock_receive():
        if False:
            yield

    mock_session.receive = mock_receive

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

    async with asyncio.timeout(5):
        async for _ in gl.start_session(
            audio_input_queue=asyncio.Queue(),
            video_input_queue=asyncio.Queue(),
            text_input_queue=asyncio.Queue(),
            audio_output_callback=AsyncMock(),
            audio_interrupt_callback=AsyncMock(),
        ):
            pass

    mock_session.send_client_content.assert_not_awaited()


@pytest.mark.asyncio
async def test_session_dead_yields_session_dead_event():
    """Fatal receive errors surface a reconnect-friendly session_dead event."""
    gl = GeminiLive(
        api_key="test",
        model="test-model",
        input_sample_rate=16000,
    )

    mock_session = AsyncMock()

    async def mock_receive():
        raise Exception("1008 policy violation")
        yield

    mock_session.receive = mock_receive

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
                if event.get("type") == "session_dead":
                    break
    except (TimeoutError, Exception):
        pass

    assert events[0] == {
        "type": "session_dead",
        "content": "1008 policy violation",
        "error": "1008 policy violation",
    }
