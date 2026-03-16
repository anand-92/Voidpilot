# Walkthrough Mode API Endpoint

## Overview

The walkthrough endpoint (`/api/v1/live/walkthrough`) provides a voice-first guide to the Voidpilot project. It runs a Gemini Live audio session on the backend and exposes a single project-grounding tool, `search_project_context`, which is fulfilled server-side through a separate Gemini File Search request.

## WebSocket Path

```
WS /api/v1/live/walkthrough
```

## Model Configuration

- **Model**: `gemini-2.5-flash-native-audio-preview-12-2025`
- **Input Sample Rate**: 16000 Hz (microphone input)
- **Output Sample Rate**: 24000 Hz (audio playback)
- **Max Retries**: 3

## System Prompt

The walkthrough endpoint uses a built-in system prompt that keeps the assistant scoped to the Voidpilot project and requires grounding before answering project questions:

```python
SYSTEM_PROMPT = """You are Voidpilot — a voice guide that exists solely to answer \
questions about the Voidpilot project. You are NOT a general-purpose assistant. \
Do not answer general knowledge questions, do not help with tasks unrelated to \
Voidpilot, and do not make up information about the project.

CRITICAL RULES:
1. ALWAYS call search_project_context BEFORE answering ANY question about the \
project. Never rely on your own knowledge — the codebase is the source of truth.
2. If a user asks something unrelated to Voidpilot, politely redirect them.
3. If your first search didn't return enough detail, call the tool AGAIN with a \
refined query.
4. Base your responses ONLY on what the tool returns.
"""
"""
```

## Client Messages (Client → Server)

### Session Config Message

```json
{
  "type": "session_config",
  "voice_name": "Despina"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"session_config"` |
| `voice_name` | string | Optional allowed Gemini voice name |

### Text Message

```json
{
  "type": "text",
  "content": "Tell me about Voidpilot"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `content` | string | The text content to send to Gemini |

## Server Messages (Server → Client)

### Audio Message

```json
{
  "type": "audio",
  "content": "hex_encoded_audio_data..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"audio"` |
| `content` | string | Hex-encoded PCM16 audio data at 24kHz |

### Text Message

```json
{
  "type": "text",
  "role": "gemini",
  "content": "I'm Voidpilot. I hear voices and take the wheel."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `role` | string | Either `"user"` or `"gemini"` |
| `content` | string | The text content |

### Tool Call Start

```json
{
  "type": "tool_call_start",
  "name": "search_project_context"
}
```

Sent when the walkthrough begins a project-grounding lookup.

### Tool Call Result

```json
{
  "type": "tool_call",
  "name": "search_project_context",
  "args": {"query": "walkthrough endpoint"},
  "result": "The walkthrough WebSocket endpoint is ..."
}
```

Sent when the grounding lookup completes.

### Interrupted Message

```json
{
  "type": "interrupted"
}
```

Sent when audio playback is interrupted.

### Error Message

```json
{
  "type": "error",
  "content": "Error message description"
}
```

### Turn Complete

```json
{
  "type": "turn_complete"
}
```

Marks the end of a Gemini response turn.

### Generation Complete

```json
{
  "type": "generation_complete"
}
```

Indicates audio generation is finished before turn completion.

### Session Resumption Update

```json
{
  "type": "session_resumption_update",
  "handle": "...",
  "resumable": true
}
```

## Connection Handling

1. **Connection**: Client opens the websocket and can immediately send `session_config`
2. **Live session**: Backend starts a Gemini Live session with audio transcription enabled
3. **Grounding**: When Gemini calls `search_project_context`, the backend runs a separate File Search-backed `generate_content` request and returns the result into the live conversation
4. **Input modes**:
   - Audio bytes stream directly into the audio input queue
   - Text messages go through the same live session via `text_input_queue`
5. **Cleanup**: On disconnect, the receive task is cancelled and the websocket is closed
6. **Retries**: The session loop retries up to `MAX_RETRIES` (`3`) on failure

## Tools

Walkthrough mode exposes one backend-fulfilled tool:

- `search_project_context` — searches the project documentation through a Gemini File Search store

The live model does not directly read local files. Grounding happens through the backend helper request.

## Audio Format

- **Input**: PCM16 at 16kHz (resampled from microphone)
- **Output**: PCM16 at 24kHz

## Source Code

- Endpoint: `src/app/api/v1/endpoints/walkthrough.py`
- Grounding helper: `src/app/services/file_search_service.py`
- Service: `src/app/services/gemini_audio.py`
- Manager: `src/app/services/ws_manager.py`
