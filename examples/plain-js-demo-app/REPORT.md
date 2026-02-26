# Gemini Live API - Plain JS Demo Report

## Overview

This demo is a **vanilla JavaScript** (no frameworks) implementation of a WebSocket client for Google's **Gemini Live API**. It enables real-time multimodal communication between a browser and Gemini, supporting audio, video, screen sharing, and custom tool execution. The project demonstrates how to build a full-featured conversational AI interface using only native web APIs.

## What This Demo Does

### Core Features

1. **Real-time Audio Streaming**
   - Captures microphone input and streams it to Gemini Live
   - Uses AudioWorklet for low-latency audio processing
   - Supports device selection for multiple microphones

2. **Video Streaming**
   - Captures camera feed and sends frames to Gemini
   - Configurable FPS, resolution, and camera
   - Supports selection both front and back cameras on mobile devices

3. **Screen Sharing**
   - Shares entire screen or specific windows with Gemini
   - Allows Gemini to "see" what's on the user's screen

4. **Audio Playback**
   - Plays Gemini's audio responses in real-time
   - Uses AudioWorklet with a queued buffer system
   - Supports volume control

5. **Text Messaging**
   - Traditional chat interface alongside voice/video
   - Input and output transcription display

6. **Custom Tools**
   - `show_alert`: Displays browser alert dialogs based on AI requests
   - `add_css_style`: Injects CSS styles into the page dynamically

### Configuration Options

The demo provides extensive configuration:

| Option | Description |
|--------|-------------|
| Model | `gemini-live-2.5-flash-native-audio` (default) |
| Voice | Puck, Charon, Kore, Fenrir, Aoede |
| Temperature | Controls response randomness (0.0 - 2.0) |
| System Instructions | Custom prompt for the AI |
| Input/Output Transcription | Real-time speech-to-text |
| Google Grounding | Web search integration |
| Affective Dialog | Emotional voice responses |
| Proactive Audio | AI can speak without being asked |
| Activity Detection | Configurable silence detection |

---

## Technical Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  UI Layer    │  │ Media Layer  │  │ Gemini Live Client   │  │
│  │ (script.js)  │  │(mediaUtils.js)│  │  (geminilive.js)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                 │                    │                │
│         └─────────────────┼────────────────────┘                │
│                           │                                      │
│              ┌────────────▼────────────┐                        │
│              │   WebSocket (Client)   │                        │
│              │    ws://localhost:8080 │                        │
│              └────────────┬────────────┘                        │
└───────────────────────────│────────────────────────────────────┘
                            │
                            │ WebSocket + Bearer Token
                            │
         ┌──────────────────▼──────────────────┐
         │    Python Proxy Server (server.py)   │
         │  - HTTP Server (port 8000)          │
         │  - WebSocket Proxy (port 8080)      │
         │  - Google Cloud Auth                 │
         └──────────────────┬──────────────────┘
                            │
                            │ wss://us-central1-aiplatform.googleapis.com
                            │ (Gemini Live API)
                            │
         ┌──────────────────▼──────────────────┐
         │     Google Gemini Live API           │
         │  gemini-live-2.5-flash-native-audio │
         └──────────────────────────────────────┘
```

### Backend: server.py

The Python proxy server handles three responsibilities:

**1. Static File Serving**
- Serves HTML, JS, and CSS from the `frontend/` directory
- Uses `aiohttp` for HTTP handling

**2. Google Cloud Authentication**
- Uses `google.auth.default()` to retrieve credentials
- Automatically refreshes tokens when needed
- Users must run `gcloud auth application-default login` first

**3. WebSocket Proxying**
- Creates bidirectional proxy between client and Gemini API
- Forwards client messages to Gemini with bearer token
- Forwards Gemini responses back to client
- Uses SSL with certifi certificates for secure connections

Key code snippet - token generation:
```python
def generate_access_token():
    creds, _ = google.auth.default()
    if not creds.valid:
        creds.refresh(Request())
    return creds.token
```

### Frontend: geminilive.js

The core client class (`GeminiLiveAPI`) manages the WebSocket connection and message formatting:

**Connection Flow:**
1. Create WebSocket to proxy server
2. Send service URL setup message
3. Send session configuration (model, voice, tools, etc.)
4. Wait for `SETUP_COMPLETE` response
5. Begin streaming media/messages

**Message Types:**

| Direction | Message | Purpose |
|-----------|---------|---------|
| Client -> Server | `service_url` | Configure Gemini endpoint |
| Client -> Server | `setup` | Model, voice, tools config |
| Client -> Server | `client_content` | Text/image/audio data |
| Server -> Client | `serverContent` | Text/audio responses |
| Server -> Client | `toolCall` | Function execution requests |
| Server -> Client | `setupComplete` | Connection ready |

### Media Processing: mediaUtils.js

**Audio Capture (AudioStreamer):**
```
Microphone → MediaStream → AudioContext (16kHz) → AudioWorklet → Base64 PCM → WebSocket
```

- Uses AudioWorkletProcessor for buffer management
- Buffers 4096 samples before sending
- Converts Float32 to PCM16 format
- Resamples to 16kHz (Gemini requirement)

**Video Capture (VideoStreamer):**
```
Camera → MediaStream → Video Element → Canvas (JPEG) → Base64 → WebSocket
```

- Captures frames at configurable FPS
- Compresses to JPEG at configurable quality
- Uses canvas for frame extraction

**Audio Playback (AudioPlayer):**
```
WebSocket → Base64 PCM → Float32Array → AudioWorklet → GainNode → Speakers
```

- Uses queue-based buffer system
- Runs at 24kHz (Gemini output rate)
- Supports interruption for responsive UI
- Volume control via GainNode

### Audio Worklets

**capture.worklet.js:**
- Buffers incoming microphone audio in 4096-sample chunks
- Posts data to main thread via port
- Runs in isolated audio thread for low latency

**playback.worklet.js:**
- Maintains queue of audio buffers
- Fills output channel from queue
- Handles buffer exhaustion with silence
- Supports interrupt command to clear queue

### Custom Tools: tools.js

Tools are implemented as classes extending `FunctionCallDefinition`:

```javascript
class ShowAlertTool extends FunctionCallDefinition {
  constructor() {
    super(
      "show_alert",
      "Displays an alert dialog box...",
      { /* JSON Schema parameters */ },
      ["message"]
    );
  }

  functionToCall(parameters) {
    alert(parameters.message);
  }
}
```

The client sends tool definitions in the setup message, and Gemini can request tool execution during conversation.

---

## What's Cool About This Demo

### 1. Zero Dependencies
- No React, Vue, Angular
- No npm build step
- Just vanilla JavaScript and HTML
- Easy to understand and modify

### 2. Low-Latency Audio
- AudioWorklet runs in a separate audio thread
- Buffer-based system prevents main thread blocking
- 16kHz capture / 24kHz playback matches Gemini specs

### 3. Full Multimodal Support
- Audio in/out
- Video in
- Screen sharing
- Text
- All working together in real-time

### 4. Custom Tool Execution
- AI can trigger browser alerts
- AI can inject CSS to change page appearance
- Demonstrates bidirectional AI-browser integration

### 5. Production-Ready Patterns
- SSL/TLS with proper certificates
- Graceful connection handling
- Error states and reconnection
- Activity detection configuration
- Transcription support

### 6. Comprehensive Configuration
- 5 different voice options
- Temperature, proactivity, grounding
- Speech sensitivity tuning
- Device selection

---

## Running the Demo

```bash
# Install dependencies
pip3 install -r requirements.txt

# Authenticate with Google Cloud
gcloud auth application-default login

# Start server (serves UI + WebSocket proxy)
python3 server.py

# Open browser
open http://localhost:8000
```

---

## File Structure Summary

| File | Purpose |
|------|---------|
| `server.py` | Python proxy with auth and WebSocket forwarding |
| `frontend/index.html` | Main UI with configuration form |
| `frontend/geminilive.js` | Core Gemini Live client class |
| `frontend/mediaUtils.js` | Audio/video capture and playback |
| `frontend/script.js` | UI logic and event handling |
| `frontend/tools.js` | Custom tool definitions |
| `frontend/audio-processors/capture.worklet.js` | Audio capture processor |
| `frontend/audio-processors/playback.worklet.js` | Audio playback processor |

---

## Conclusion

This demo showcases the power of the Gemini Live API with a minimal, educational implementation. It proves that sophisticated real-time AI interactions can be built with vanilla JavaScript, making it an excellent starting point for developers wanting to understand the underlying APIs without framework overhead. The combination of WebSocket proxying, AudioWorklet processing, and multimodal streaming represents a complete modern web audio/video architecture.
