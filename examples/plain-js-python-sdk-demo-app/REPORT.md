# Gemini Live API Demo Report

## Overview

This demo application demonstrates a real-time multimodal conversational AI system using Google's **Gemini Live API** with the **Google Gen AI Python SDK** for the backend and **vanilla JavaScript** for the frontend. It enables bi-directional audio communication, video/image input, and text chat with an AI assistant.

## What This Demo Does

The application provides a live voice and video chat interface with the Gemini Live AI model. Users can:

1. **Voice Communication**: Speak to the AI assistant and receive spoken responses in real-time
2. **Video Input**: Share their camera feed or screen to show things to the AI
3. **Text Chat**: Type messages as an alternative to voice
4. **Live Transcription**: See both user speech and AI responses transcribed in real-time

The demo is pre-configured to use:
- The **Puck** voice (a prebuilt voice from Google)
- A friendly Irish accent personality
- Proactive audio capabilities
- Native audio output at 24kHz sample rate

## Technical Architecture

### System Components

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser       │         │  FastAPI        │         │  Google Cloud   │
│   (Vanilla JS)  │◄───────►│  Backend        │◄───────►│  Gemini Live   │
│                 │  WS     │  (Python)       │         │  API            │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Backend (Python)

#### `main.py` - FastAPI Server

The backend is a FastAPI application that:

- Serves the static frontend files from the `/` endpoint
- Provides a WebSocket endpoint at `/ws` for real-time communication
- Manages three input queues: audio, video, and text
- Routes audio responses back to the client via WebSocket
- Forwards events like transcriptions and interruptions to the client

Key features:
- CORS middleware allowing cross-origin requests
- Static the frontend
- Asynchronous queue-based message handling
- file serving for Proper cleanup on disconnect

#### `gemini_live.py` - Gemini Live Wrapper

The `GeminiLive` class wraps the Google Gen AI SDK to manage the live connection:

- **Initialization**: Creates a `genai.Client` configured for Vertex AI with project ID and location
- **Session Configuration**: Sets up the live connection with:
  - Audio response modality
  - Prebuilt voice (Puck)
  - System instructions (friendly Irish accent persona)
  - Audio transcription for both input and output
  - Proactive audio support
  - Optional tool definitions

- **Session Management**: Uses `async with` for proper connection lifecycle:
  ```python
  async with self.client.aio.live.connect(model=self.model, config=config) as session:
  ```

- **Parallel Input/Output Tasks**:
  - `send_audio()`: Reads from audio queue, sends PCM data to Gemini
  - `send_video()`: Reads from video queue, sends JPEG frames
  - `send_text()`: Sends text messages
  - `receive_loop()`: Handles responses, including audio data, transcriptions, tool calls

- **Tool Support**: The class can register custom tools that the AI can call, with results sent back to the model

### Frontend (Vanilla JavaScript)

#### `index.html` - User Interface

A clean HTML interface with:
- Connection status indicator
- Buttons for mic, camera, and screen sharing
- Text input for typed messages
- Video preview area
- Chat log showing transcriptions
- Session restart controls

#### `gemini-client.js` - WebSocket Client

A simple WebSocket wrapper that:
- Connects to `ws://localhost:8000/wss` (or `wss://` for HTTPS)
- Uses binary WebSocket for efficient audio transfer
- Provides callbacks for open, message, close, and error events
- Methods for sending:
  - Raw audio data (binary)
  - Text messages (JSON)
  - Images (JSON with base64 data)

#### `media-handler.js` - Audio/Video Handling

Comprehensive media management:

**Audio Capture**:
- Uses `navigator.mediaDevices.getUserMedia()` for microphone access
- Uses `AudioWorklet` with a custom `PCMProcessor` for efficient audio processing
- Downsamples from the browser's sample rate to 16kHz (required by Gemini)
- Converts Float32 to Int16 PCM format
- Mutes local audio to prevent feedback

**Audio Playback**:
- Receives raw PCM Int16 data from the WebSocket
- Converts to Float32 and normalizes
- Creates an AudioBuffer at 24kHz (Gemini's output rate)
- Uses `AudioBufferSourceNode` with precise scheduling for smooth playback
- Manages a queue of scheduled sources for continuous playback

**Video Capture**:
- Supports both camera and screen sharing via `getUserMedia()` and `getDisplayMedia()`
- Captures frames at 1 FPS
- Resizes to 640x480 and encodes as JPEG at 70% quality
- Sends base64-encoded frames to the backend

#### `pcm-processor.js` - AudioWorklet Processor

A minimal AudioWorklet that:
- Buffers incoming audio in 4096-sample chunks
- Posts buffered data to the main thread via `port.postMessage()`
- Runs in a separate audio processing thread for low latency

### Communication Flow

1. **Connection**:
   - User clicks "Connect"
   - Frontend establishes WebSocket connection
   - Backend creates a Gemini Live session

2. **Sending Audio**:
   - User clicks "Start Mic"
   - Browser captures audio → PCMProcessor → downsample → Int16
   - Frontend sends raw PCM bytes via WebSocket
   - Backend queues audio → sends to Gemini API

3. **Receiving Audio**:
   - Gemini API sends audio responses as raw PCM
   - Backend receives and forwards via WebSocket (binary)
   - Frontend plays audio via Web Audio API

4. **Video/Images**:
   - User starts camera or screen share
   - Frontend captures JPEG frames at 1 FPS
   - Sends base64 JPEG to backend via JSON message
   - Backend forwards to Gemini as video input

5. **Transcription**:
   - Both user speech and AI responses are transcribed
   - Backend sends transcription events as JSON
   - Frontend displays in chat log

## What's Cool About This Demo

### 1. Pure Web Audio API Implementation

The demo uses the Web Audio API directly with `AudioWorklet` for efficient, low-latency audio processing. This is more complex than using higher-level libraries but provides:
- Precise control over audio buffering
- Low-latency capture and playback
- Efficient sample rate conversion

### 2. Native Audio Streaming

Unlike typical web speech interfaces that use Web Speech API, this demo:
- Sends raw PCM audio to Gemini (not compressed speech)
- Receives raw PCM audio from Gemini
- Achieves true real-time voice conversation

### 3. Bi-directional Streaming

The architecture supports simultaneous:
- Audio input and output
- Video input while receiving audio
- Text chat alongside voice

### 4. Flexible Media Sources

Users can choose between:
- Microphone only (voice-only mode)
- Camera (video mode)
- Screen sharing (show the AI what's on their screen)
- Any combination of the above

### 5. Tool Integration

The backend demonstrates how to register server-side tools that the AI can invoke, enabling:
- Function calling from the AI
- Server-side processing of AI requests
- Extensible AI capabilities

### 6. Production-Ready Patterns

The code demonstrates:
- Proper async/await patterns throughout
- Clean separation of concerns (media, WebSocket, API)
- Error handling and cleanup
- Queue-based message passing
- Graceful disconnection handling

### 7. Zero Build Step Frontend

The frontend uses vanilla JavaScript with no:
- React, Vue, or other frameworks
- Webpack, Vite, or bundlers
- npm dependencies

This makes the demo:
- Easy to understand
- Simple to modify
- Lightweight to serve

### 8. Proactive Audio

The demo enables `proactive_audio=True`, which allows Gemini to:
- Begin speaking before the user finishes their thought
- Provide more natural conversational flow
- Better match the tone and emotion of conversation

## Dependencies

**Backend**:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `google-genai` - Google Gemini Python SDK
- `websockets` - WebSocket support
- `python-dotenv` - Environment variable loading
- `python-multipart` - Multi-part message support

**Frontend**:
- None (pure browser APIs)

## Configuration

The demo requires:
1. A Google Cloud project with Vertex AI API enabled
2. Authentication via `gcloud auth application-default login`
3. The `PROJECT_ID` set in `main.py` or via environment variable

## Conclusion

This demo showcases a production-grade implementation of real-time multimodal AI communication. It demonstrates best practices for:
- WebSocket-based real-time communication
- Raw audio streaming with the Web Audio API
- Integration with Google's Gemini Live API via the official Python SDK
- Building accessible AI interfaces with vanilla JavaScript

The combination of FastAPI's async capabilities, the Google Gen AI SDK's clean API, and the browser's native media APIs creates a powerful foundation for building conversational AI applications.
