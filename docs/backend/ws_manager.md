# WebSocket Manager Service

## Overview

The `ws_manager.py` module provides the `WebSocketManager` class, a helper utility for managing WebSocket connections and queues in Gemini Live sessions. It handles the bidirectional communication between the backend and frontend clients.

## Key Classes

### `WebSocketManager`

A helper class that manages WebSocket connections and provides utility methods for sending/receiving data.

#### Constructor

```python
def __init__(self, websocket: WebSocket, name: str = "Client")
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `websocket` | `WebSocket` | The FastAPI WebSocket connection |
| `name` | `str` | Optional name for logging purposes (default: "Client") |

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `websocket` | `WebSocket` | The underlying WebSocket connection |
| `name` | `str` | Identifier for logging |
| `audio_input_queue` | `asyncio.Queue[bytes]` | Queue for incoming audio data |
| `video_input_queue` | `asyncio.Queue[bytes]` | Queue for incoming video data |
| `text_input_queue` | `asyncio.Queue[str]` | Queue for incoming text messages |

## Key Methods

### `send_to_client`

```python
async def send_to_client(self, payload: dict) -> None
```

Safely sends a JSON payload to the connected client.

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `dict` | The JSON-serializable payload to send |

**Behavior:**
- Checks if WebSocket is still connected before sending
- Silently catches and logs errors (non-blocking)

---

### `audio_output_callback`

```python
async def audio_output_callback(self, data: bytes) -> None
```

Callback for handling audio output from Gemini.

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `bytes` | Raw audio data bytes |

**Behavior:**
- Converts audio bytes to hex string
- Sends as `{"type": "audio", "content": <hex_string>}` to client

---

### `audio_interrupt_callback`

```python
async def audio_interrupt_callback(self) -> None
```

Callback for handling audio interruption events.

**Behavior:**
- Sends `{"type": "interrupted"}` to client
- Used when user interrupts Gemini's response

---

### `receive_from_client`

```python
async def receive_from_client(
    self, 
    handle_client_message_fn: Callable | None = None
) -> None
```

Continuous loop that receives messages from the client and routes them to appropriate queues.

| Parameter | Type | Description |
|-----------|------|-------------|
| `handle_client_message_fn` | `Callable \| None` | Optional async function to handle custom messages |

**Behavior:**
1. Listens for WebSocket messages in a loop
2. **Binary messages**: Puts audio data in `audio_input_queue`
3. **Text messages**:
   - Tries to parse as JSON
   - If JSON and `handle_client_message_fn` returns True, skips queuing
   - Otherwise, puts raw text in `text_input_queue`
4. Handles disconnects gracefully
5. Logs errors with traceback

**Exception Handling:**
- `WebSocketDisconnect`: Normal disconnect, logs info
- `RuntimeError` with "disconnect": Normal disconnect
- Other exceptions: Logged as errors

---

### `forward_gemini_event`

```python
async def forward_gemini_event(self, event: dict) -> None
```

Common logic to forward Gemini events to the WebSocket client.

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `dict` | Event dictionary from Gemini Live |

**Event Handling:**

| Event Type | Action |
|------------|--------|
| `user` or `gemini` | Sends as text with role |
| `tool_call` | Sends tool call details and result |
| `session_resumption_update` | Forwards the update event |
| (any other) | Forwards as-is |

## Message Formats

### Outgoing Messages (to client)

```python
# Audio
{"type": "audio", "content": "<hex_encoded_audio>"}

# Text
{"type": "text", "role": "user" | "gemini", "content": "..."}

# Tool Call
{
    "type": "tool_call",
    "name": "tool_name",
    "args": {...},
    "result": "..."
}

# Interruption
{"type": "interrupted"}

# Session Resumption
{"type": "session_resumption_update", "handle": "...", "resumable": true}

# Generic
{"type": "...", ...}
```

### Incoming Messages (from client)

```python
# Binary (audio)
<raw bytes>

# Text
"<text_message>"

# JSON
{"key": "value", ...}
```

## System Interactions

### Upstream Dependencies

- **FastAPI**: Uses `WebSocket` from `fastapi`
- **asyncio**: Uses `asyncio.Queue` for message queuing

### Downstream Dependencies

Used by all WebSocket endpoints in `src/app/api/v1/endpoints/`:
- `live.py` - Main live assistant mode
- `brainstorm.py` - Brainstorm mode
- `walkthrough.py` - Walkthrough mode

### Data Flow

```
Frontend → WebSocket → receive_from_client() → Queues → GeminiLive
GeminiLive → Events → forward_gemini_event() → WebSocket → Frontend
```

## Usage Example

```python
from fastapi import WebSocket
from app.services.ws_manager import WebSocketManager

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    manager = WebSocketManager(websocket, name="User")
    
    # Start receiving in background
    receive_task = asyncio.create_task(
        manager.receive_from_client()
    )
    
    # Process Gemini events
    async for event in gemini_session:
        await manager.forward_gemini_event(event)
```

## Error Handling

The class implements defensive error handling:
- Checks connection state before sending
- Catches and logs exceptions without propagating
- Distinguishes between normal disconnects and errors
- Logs detailed tracebacks for debugging
