# Gemini Audio Service

## Overview

The `gemini_audio.py` module provides the core `GeminiLive` class, which handles all interactions with the Gemini Live API. This is the primary service for managing real-time voice conversations with Gemini, including audio input/output, tool execution, session resumption, and context management.

## Key Classes and Functions

### `GeminiLive`

The main class that encapsulates the Gemini Live session. It manages the WebSocket connection, audio/video/text streams, and tool execution.

#### Constructor Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `api_key` | `str` | Google API key for authentication |
| `model` | `str` | The Gemini model to use (e.g., "gemini-2.0-flash-exp") |
| `input_sample_rate` | `int` | Audio sample rate (typically 16000 Hz for microphone input) |
| `tools` | `list[dict]` | Optional list of tool definitions to make available to Gemini |
| `tool_mapping` | `dict` | Optional mapping of tool names to Python callables |
| `system_prompt` | `str` | Optional system prompt to configure the assistant's behavior |
| `session_resumption_handle` | `str \| None` | Optional handle for resuming a previous session |

#### Key Methods

##### `start_session`

```python
async def start_session(
    self,
    audio_input_queue,
    video_input_queue,
    text_input_queue,
    audio_output_callback,
    audio_interrupt_callback=None,
)
```

This is a generator function that manages the entire lifecycle of a Gemini Live session:

1. **Connection**: Establishes a WebSocket connection to the Gemini Live API
2. **Input Handling**: Creates separate tasks for sending audio, video, and text input
3. **Output Handling**: Continuously receives and processes responses from Gemini
4. **Event Yielding**: Yields events to the caller for processing (text, audio, tool calls, etc.)

The method handles:
- Audio output via callback
- Transcription (both user and Gemini)
- Tool call execution
- Session interruption detection
- Session resumption updates
- Error handling and recovery

#### Internal Methods

| Method | Description |
|--------|-------------|
| `_send_loop` | Generic loop for sending audio/video/text data to Gemini |
| `_receive_loop` | Main loop for receiving responses from Gemini |
| `_handle_server_content` | Processes server content (audio, text, transcriptions) |
| `_handle_tool_call` | Dispatches tool calls to background tasks |
| `_dispatch_tool_call` | Executes a single tool call and sends the response |
| `_handle_receive_error` | Classifies errors as fatal or recoverable |

## How It Works

### Session Flow

1. **Initialization**: The class is instantiated with API key, model, tools, and callbacks
2. **Connection**: `start_session` is called, which creates a WebSocket connection using the `genai` client
3. **Send Tasks**: Three asyncio tasks are created to handle audio, video, and text input streams
4. **Receive Loop**: A single task continuously receives responses and processes them
5. **Event Processing**: Various event types are yielded to the caller:
   - `text`: Text responses from Gemini
   - `audio`: Audio data for playback
   - `user`/`gemini`: Transcription events
   - `tool_call_start`/`tool_call`: Tool execution events
   - `turn_complete`: End of a conversation turn
   - `interrupted`: User interrupted the response
   - `session_resumption_update`: Session handle for resumption
   - `session_dead`: Connection lost
   - `error`: Error occurred

### Tool Execution

Tools are executed asynchronously in background tasks to avoid blocking the receive loop:

1. When a tool call is received, it's dispatched to a background task
2. The tool function is called with the provided arguments
3. Results are sent back to Gemini via `send_tool_response`
4. Events are yielded to inform the caller about tool execution

### Session Resumption

The service supports session resumption:
- On startup, an optional `session_resumption_handle` can be provided
- During the session, new handles are periodically emitted via `session_resumption_update` events
- These handles can be stored and used to resume conversations

## System Interactions

### Upstream Dependencies

- **Google GenAI Client**: Uses `google.genai` for API communication
- **Tool Functions**: Calls Python functions provided via `tool_mapping`

### Downstream Dependencies

This service is used by the WebSocket endpoints in `src/app/api/v1/endpoints/`:
- `live.py` - Main live assistant mode
- `brainstorm.py` - Brainstorm mode with artifact tools
- `walkthrough.py` - Walkthrough mode with custom prompts

### Data Flow

```
Microphone → audio_input_queue → GeminiLive → audio_output_callback → Speaker
Video → video_input_queue → GeminiLive
Text → text_input_queue → GeminiLive
Gemini Responses → Events → WebSocket → Frontend
```

## Configuration

The session uses the following default configurations:

- **Response Modality**: Audio
- **Voice**: Puck (prebuilt voice)
- **Context Compression**: Trigger at 25600 tokens, slide to 12800 tokens
- **Audio Transcription**: Enabled for both input and output
