# Customer Service Agent Demo - Technical Report

## Overview

This demo application showcases a next-generation customer support agent built with the Gemini Live API. It demonstrates how AI-powered voice assistants can see, hear, understand emotions, and execute real actions to resolve customer issues.

---

## What This Demo Does

The Customer Service Agent Demo simulates a futuristic support interaction where an AI agent:

1. **Sees What You See**: Using the device camera, the agent can view items the customer shows (e.g., for product returns or troubleshooting)
2. **Hears Your Voice**: Processes spoken input in real-time for natural voice conversations
3. **Understands Your Emotions**: Detects the customer's emotional state and responds with appropriate empathy
4. **Takes Real Actions**: Executes tools like processing refunds or transferring to human agents

### User Interactions

Users can:
- Speak naturally with the agent via microphone
- Show items to their camera for visual demonstrations
- Share their screen for remote troubleshooting
- Request refunds by providing transaction IDs
- Request to speak with a human agent for complex issues

---

## How It Works Technically

### Architecture Overview

The application consists of two main components:

```
[React Frontend] <--WebSocket--> [Python Proxy Server] <--WSS--> [Gemini Live API]
```

### 1. Backend: Python WebSocket Proxy (`server.py`)

The Python backend (`/home/nik/gemini-live-3d-bridge/examples/customer-support-demo-app/server.py`) acts as a secure bridge between the frontend and Google's Gemini Live API:

**Authentication Flow:**
- Uses Google Cloud's default credentials via `google.auth.default()`
- Automatically generates OAuth bearer tokens for authentication
- Supports both token-based and credential-based auth

**WebSocket Proxy:**
- Runs on `ws://localhost:8080` by default
- Establishes bidirectional proxy between client and Gemini API
- Uses SSL/TLS with certifi certificates for secure connections
- Handles connection lifecycle and error management

**Key Code Snippet - Token Generation:**
```python
def generate_access_token():
    creds, _ = google.auth.default()
    if not creds.valid:
        creds.refresh(Request())
    return creds.token
```

### 2. Frontend: React Application

#### Core Components

**`LiveAPIDemo.jsx`** (`/home/nik/gemini-live-3d-bridge/examples/customer-support-demo-app/src/components/LiveAPIDemo.jsx`)

The main React component that orchestrates:
- Connection management (connect/disconnect)
- Media controls (audio, video, screen sharing)
- Chat interface
- Configuration panels

**System Instructions:**
The agent is configured with specific instructions that define its behavior:
```
You are a helpful and polite Customer Service Agent. Your goal is to assist
the user with their inquiries, process refunds if necessary, or connect them
to a human agent if the issue is complex.
```

#### Media Handling (`media-utils.js`)

The demo implements four key media utilities:

1. **AudioStreamer** - Captures microphone input at 16kHz (Gemini requirement)
   - Uses Web Audio API with AudioWorklet for low-latency capture
   - Converts Float32 to PCM16 format
   - Encodes to base64 for transmission

2. **VideoStreamer** - Captures camera feed
   - Supports front/back camera selection
   - Configurable FPS (default: 1 fps)
   - JPEG compression for efficient transmission

3. **ScreenCapture** - Captures screen/window
   - Uses `getDisplayMedia` API
   - Handles stream end events gracefully

4. **AudioPlayer** - Plays Gemini's audio responses
   - Operates at 24kHz (Gemini's output sample rate)
   - Uses AudioWorklet for smooth playback
   - Supports volume control and interruption

#### Gemini API Client (`gemini-api.js`)

The `GeminiLiveAPI` class (`/home/nik/gemini-live-3d-bridge/examples/customer-support-demo-app/src/utils/gemini-api.js`) handles all communication with the Gemini Live API:

**Configuration Options:**
- Model: `gemini-live-2.5-flash-native-audio`
- Voice: Puck (default), Charon, Kore, Fenrir, Aoede
- Temperature: 0.1 - 2.0
- Response modalities: AUDIO
- Affective dialog (emotion detection)
- Google grounding for web search
- Input/output transcription

**Message Types Supported:**
- TEXT - Plain text responses
- AUDIO - Voice audio chunks
- TOOL_CALL - Function invocation requests
- INPUT_TRANSCRIPTION - User speech to text
- OUTPUT_TRANSCRIPTION - AI speech to text
- SETUP_COMPLETE / TURN_COMPLETE / INTERRUPTED

#### Tool System (`tools.js`)

The demo implements custom tools that the AI can invoke:

1. **ProcessRefundTool** - `process_refund`
   - Parameters: `transactionId`, `reason`
   - Displays confirmation modal with transaction details

2. **ConnectToHumanTool** - `connect_to_human`
   - Parameters: `reason`
   - Shows transfer modal to simulate human handoff

3. **Additional Tools** (from base implementation):
   - `show_modal` - Display custom modal dialogs
   - `add_css_style` - Inject CSS styles dynamically
   - `end_conversation` - End the support session
   - `point_to_location` - Highlight screen locations

### 3. Audio Worklets

Custom AudioWorklet processors for efficient audio handling:

**Capture Worklet** (`public/audio-processors/capture.worklet.js`)
- Processes microphone audio in real-time
- Sends chunks to main thread via message port

**Playback Worklet** (`public/audio-processors/playback.worklet.js`)
- Receives and plays audio chunks
- Handles interruption signals

---

## What's Cool About This Demo

### 1. True Multimodal Interaction

Unlike traditional chatbots that only handle text, this demo seamlessly combines:
- Real-time voice conversation
- Live video feed from camera
- Screen sharing for remote assistance
- Emotion detection for empathetic responses

This creates a much more natural, human-like support experience.

### 2. Real Tool Execution

The AI doesn't just talk - it takes action. The agent can:
- Process actual refund transactions (simulated)
- Transfer to human agents when needed
- This demonstrates how AI agents can integrate with existing business systems

### 3. Emotion-Aware Responses

The "Affective Dialog" feature enables the AI to:
- Detect frustration, satisfaction, or confusion in the user's voice
- Adjust its tone and responses accordingly
- Show appropriate empathy

This makes the interaction feel much more human and caring.

### 4. Low-Latency Real-Time Communication

Using WebSockets for bidirectional streaming:
- Audio flows continuously without polling
- Sub-second response times
- Natural conversation flow with interruption support

### 5. Flexible Configuration

The demo exposes many Gemini API settings:
- Voice selection (5 different voices)
- Temperature control for creativity vs. precision
- Speech sensitivity tuning
- Activity detection configuration
- Google grounding toggle
- Transcription options

This makes it an excellent tool for exploring and understanding the API capabilities.

### 6. Production-Ready Patterns

The code demonstrates:
- Proper error handling and cleanup
- Resource management (disposing audio contexts)
- State management for complex UI
- Device enumeration and selection
- Local storage for configuration persistence

---

## Technical Highlights Summary

| Feature | Implementation |
|---------|----------------|
| Real-time Audio | Web Audio API + AudioWorklet at 16kHz input / 24kHz output |
| Video Streaming | Canvas-based frame capture at configurable FPS |
| WebSocket Proxy | Python asyncio + websockets library |
| Authentication | Google Cloud OAuth with default credentials |
| Tool System | Function declarations passed to Gemini API |
| Emotion Detection | `enable_affective_dialog` configuration flag |
| Speech Recognition | Input/output transcription with delta updates |

---

## Conclusion

This Customer Service Agent Demo represents a significant leap forward in customer support technology. By combining vision, voice, emotion detection, and actionable tools, it demonstrates the potential of AI to transform how businesses interact with their customers. The demo serves both as a proof-of-concept and a valuable development tool for understanding the Gemini Live API's capabilities.

For developers, it provides a comprehensive starting point for building production-grade multimodal AI applications with real-world utility.
