import asyncio
from types import SimpleNamespace

import pytest

from src.app.services.gemini_audio import GeminiLive, _sanitize_live_text


def test_sanitize_live_text_removes_ctrl_markers_and_control_chars():
    raw = "Hello<ctrl46>\x00\x1f world"
    assert _sanitize_live_text(raw) == "Hello world"


@pytest.mark.asyncio
async def test_handle_server_content_sanitizes_transcriptions():
    gemini = GeminiLive(api_key="test-key", model="test-model", input_sample_rate=16000)
    event_queue: asyncio.Queue = asyncio.Queue()

    server_content = SimpleNamespace(
        model_turn=SimpleNamespace(
            parts=[SimpleNamespace(inline_data=None, text="Hi<ctrl46>\x00")]
        ),
        input_transcription=SimpleNamespace(text="\x00<ctrl46>"),
        output_transcription=SimpleNamespace(text="Done<ctrl46>\x1f"),
        turn_complete=False,
        interrupted=False,
    )

    async def _audio_output_callback(_data: bytes) -> None:
        return None

    await gemini._handle_server_content(
        server_content,
        event_queue,
        _audio_output_callback,
        None,
    )

    events: list[dict] = []
    while not event_queue.empty():
        events.append(await event_queue.get())

    assert {"type": "text", "content": "Hi"} in events
    assert {"type": "gemini", "text": "Done"} in events
    assert not any(event.get("type") == "user" for event in events)


@pytest.mark.asyncio
async def test_handle_server_content_emits_generation_complete():
    gemini = GeminiLive(api_key="test-key", model="test-model", input_sample_rate=16000)
    event_queue: asyncio.Queue = asyncio.Queue()

    server_content = SimpleNamespace(
        model_turn=None,
        input_transcription=None,
        output_transcription=None,
        generation_complete=True,
        turn_complete=False,
        interrupted=False,
    )

    async def _audio_output_callback(_data: bytes) -> None:
        return None

    await gemini._handle_server_content(
        server_content,
        event_queue,
        _audio_output_callback,
        None,
    )

    events: list[dict] = []
    while not event_queue.empty():
        events.append(await event_queue.get())

    assert events == [{"type": "generation_complete"}]
