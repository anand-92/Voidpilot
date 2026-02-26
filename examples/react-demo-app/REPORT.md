# Gemini Live API React Demo - Technical Report

## Overview

The **Gemini Live API React Demo** is a complete, full-stack demonstration application that showcases Google's Gemini Multimodal Live API with real-time audio and video streaming capabilities. It provides a polished user interface for interacting with Gemini's voice assistant in a conversational manner, featuring live audio input/output, camera and screen sharing, custom tools, and configurable AI behavior settings.

## What This Demo Does

The demo creates a voice-powered conversational interface with Gemini, allowing users to:

1. **Speak with Gemini in real-time** - Voice conversations with ultra-low latency audio streaming
2. **Share video input** - Stream camera feed to Gemini for visual context
3. **Share their screen** - Let Gemini see what's on their screen
4. **Type messages** - Fallback text-based communication
5. **Use custom tools** - Gemini can trigger browser actions like showing alerts or injecting CSS styles
6. **Configure AI behavior** - Adjust voice, temperature, system instructions, and activity detection

## Technical Architecture

The demo consists of two main components:

### Frontend (React + Vite)

**Location:** `/home/nik/gemini-live-3d-bridge/examples/react-demo-app/`

The frontend is a React 19 application built with Vite that handles all user interaction and media processing.

#### Key Files:

- **`src/components/LiveAPIDemo.jsx`** - Main application component
  - Manages connection state, chat messages, media streaming controls
  - Provides comprehensive configuration UI for all Gemini settings
  - Handles real-time message display and transcription

- **`src/utils/gemini-api.js`** - Gemini WebSocket client library
  - `GeminiLiveAPI` class - Main client that manages the WebSocket connection to the backend
  - `MultimodalLiveResponseMessage` - Parses incoming messages (text, audio, tool calls, transcriptions)
  - `FunctionCallDefinition` - Base class for custom tool definitions
  - Supports multiple voice options: Puck, Charon, Kore, Fenrir, Aoede

- **`src/utils/media-utils.js`** - Audio/Video processing utilities
  - `AudioStreamer` - Captures microphone audio at 16kHz (Gemini's required sample rate)
  - `VideoStreamer` - Streams camera frames as JPEG images
  - `ScreenCapture` - Captures and streams screen content
  - `AudioPlayer` - Plays Gemini's audio responses at 24kHz

- **`src/utils/tools.js`** - Custom tool definitions
  - `ShowAlertTool` - Displays browser alert dialogs
  - `AddCSSStyleTool` - Injects CSS styles into the page

- **`public/audio-processors/`** - Web Audio API Worklets
  - `capture.worklet.js` - Low-latency microphone capture
  - `playback.worklet.js` - Low-latency audio playback

### Backend (Python WebSocket Proxy)

**Location:** `/home/nik/gemini-live-3d-bridge/examples/react-demo-app/server.py`

The backend is a Python WebSocket proxy server that handles authentication and proxies connections between the frontend and Google's Gemini API.

#### Key Features:

- **WebSocket Proxy** - Bridges browser client to Google's `us-central1-aiplatform.googleapis.com`
- **Automatic Authentication** - Uses Google Cloud default credentials via `gcloud auth application-default login`
- **Bidirectional Streaming** - Proxies audio, video, and text in both directions
- **SSL/TLS Support** - Uses certifi for proper certificate handling

## How It Works Technically

### Connection Flow

1. **Frontend connects to proxy** - React app opens WebSocket to `ws://localhost:8080`
2. **Proxy authenticates** - Uses `google.auth.default()` to get bearer token
3. **Proxy connects to Gemini** - Establishes secure WebSocket to Google's API
4. **Bidirectional proxy** - Messages flow between client and Gemini API

### Audio Pipeline

1. **Capture**: Microphone input -> AudioWorklet (4096 sample buffer) -> Float32Array
2. **Conversion**: Float32 -> PCM16 (Int16Array) -> Base64 encoding
3. **Transmission**: WebSocket message with `realtime_input.media_chunks`
4. **Playback**: Base64 -> Binary -> PCM16 -> Float32 -> AudioWorklet -> Speaker

### Video Pipeline

1. **Capture**: Camera/screen -> MediaStream -> Video element
2. **Frame extraction**: Canvas captures frames at configurable FPS (default 1fps)
3. **Encoding**: JPEG compression with configurable quality
4. **Transmission**: Base64 JPEG via `realtime_input.media_chunks`

### Configuration Protocol

The frontend sends a comprehensive setup message to configure the Gemini session:

```javascript
{
  setup: {
    model: "projects/{project}/locations/us-central1/...",
    generation_config: {
      response_modalities: ["AUDIO"],
      temperature: 1.0,
      speech_config: { voice_config: { prebuilt_voice_config: { voice_name: "Puck" }}}
    },
    system_instruction: { parts: [{ text: "You are helpful..." }] },
    tools: { function_declarations: [...] },
    proactivity: { proactiveAudio: true },
    realtime_input_config: { automatic_activity_detection: {...} }
  }
}
```

### Response Handling

The demo handles multiple response types:

- **TEXT** - Plain text responses displayed in chat
- **AUDIO** - PCM audio chunks played through AudioPlayer
- **INPUT_TRANSCRIPTION** - Real-time speech-to-text of user input
- **OUTPUT_TRANSCRIPTION** - Real-time speech-to-text of AI responses
- **TOOL_CALL** - Function invocation requests
- **TURN_COMPLETE** - Indicates AI finished responding
- **INTERRUPTED** - User interrupted the AI mid-response

## What's Cool About This Demo

### 1. True Real-Time Multimodal Interaction

The demo demonstrates genuine bidirectional streaming - audio flows in and out continuously without waiting for full responses. This creates a natural conversational experience comparable to phone calls.

### 2. Low-Latency Audio Processing

Using Web Audio API Worklets (AudioWorkletProcessor) instead of the main thread ensures:
- No audio glitches or dropouts during UI updates
- Consistent 16kHz capture / 24kHz playback
- Buffer management for smooth streaming

### 3. Sophisticated Activity Detection

The demo exposes Gemini's automatic activity detection controls:
- **Silence duration** - How long to wait before responding (500-10000ms)
- **Prefix padding** - How much context to include before speech (0-2000ms)
- **Speech sensitivity** - Start/end detection thresholds

### 4. Custom Tool Execution

Gemini can actually interact with the browser through custom function declarations:
- `show_alert` - Display native browser alerts
- `add_css_style` - Dynamically modify page appearance

This demonstrates the potential for building AI agents that take real actions.

### 5. Comprehensive Configuration

The UI exposes nearly all Gemini Live API parameters:
- Voice selection (5 options with different personalities)
- Temperature (creativity vs. determinism)
- Proactive audio (AI can speak without being asked)
- Affective dialog (emotionally aware responses)
- Google grounding (real-time information lookup)

### 6. Production-Ready Architecture

The separation of concerns is excellent:
- React handles UI and media capture
- Python proxy handles authentication securely
- Clean API boundaries with WebSocket protocol
- Proper error handling and reconnection logic

## Summary

This demo is a showcase of what's possible with Google's Gemini Multimodal Live API. It demonstrates not just basic voice chat, but a full-featured conversational AI interface with video input, screen sharing, custom tool execution, and extensive configuration options. The technical implementation is polished, using industry-standard patterns like Web Audio API Worklets for low-latency audio and WebSocket proxies for secure authentication.

It serves as both a learning resource and a foundation for building production voice AI applications.
