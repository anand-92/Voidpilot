# Live Mode API Endpoint

## Overview

The Live Mode endpoint (`/api/v1/live/live`) provides the primary voice assistant functionality using Gemini Live. This is the default voice assistant mode that allows users to have natural voice conversations with Gemini Live.

## WebSocket Path

```
WS /api/v1/live/live
```

## Model Configuration

- **Model**: `gemini-2.5-flash-native-audio-preview-12-2025`
- **Input Sample Rate**: 16000 Hz (microphone input)
- **Output Sample Rate**: 24000 Hz (audio playback)
- **Max Retries**: 3

## Client Messages (Client → Server)

The client sends JSON messages with the following structure:

### Text Message

```json
{
  "type": "text",
  "content": "Hello, how are you?"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `content` | string | The text content to send to Gemini |

### Image Message

```json
{
  "type": "image",
  "content": "base64_encoded_image_data..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"image"` |
| `content` | string | Base64-encoded image data |

### Tool Response Message

```json
{
  "type": "tool_response",
  "call_id": "unique_call_id",
  "result": "tool execution result"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"tool_response"` |
| `call_id` | string | The ID of the tool call being responded to |
| `result` | string | The result of the tool execution |

## Server Messages (Server → Client)

The server sends JSON messages with the following structure:

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
  "content": "Hello! How can I help you today?"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `role` | string | Either `"user"` or `"gemini"` |
| `content` | string | The text content |

### Interrupted Message

```json
{
  "type": "interrupted"
}
```

Sent when audio playback is interrupted (e.g., user starts speaking).

### Error Message

```json
{
  "type": "error",
  "content": "Error message description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"error"` |
| `content` | string | Error description |

## Connection Handling

1. **Connection**: Client connects to WebSocket, server accepts with `websocket.accept()`
2. **Session Loop**: The server runs a session loop with up to 3 retry attempts
3. **Message Handling**: 
   - Audio bytes are directly added to the audio input queue
   - JSON messages are parsed and routed to appropriate handlers
4. **Cleanup**: On disconnect, the receive task is cancelled and WebSocket is closed
5. **Retries**: If the session ends abnormally, it retries up to MAX_RETRIES (3) times

## Tools

No tools are enabled in Live Mode. This is a pure voice assistant mode.

## Audio Format

- **Input**: PCM16 at 16kHz (resampled from microphone)
- **Output**: PCM16 at 24kHz

## Source Code

- Endpoint: `src/app/api/v1/endpoints/live.py`
- Service: `src/app/services/gemini_audio.py`
- Manager: `src/app/services/ws_manager.py`
