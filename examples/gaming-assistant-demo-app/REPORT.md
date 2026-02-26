# Gaming Assistant Demo - Technical Report

## What This Demo Does

The **Real-time Gaming Guide** is a specialized React application that demonstrates how to build an AI-powered gaming assistant using Google's Gemini Live API. The demo simulates a gaming companion that watches your gameplay and listens to your voice to provide relevant tips and guides.

### Core Features

1. **Multimodal Awareness**: The assistant sees your screen via screen sharing and hears your voice through microphone input. It uses both visual and audio inputs to understand the game state and respond contextually.

2. **Persona Switching**: Users can toggle between three distinct personalities that change both the voice and conversational style:
   - **Wise Wizard** (Fenrir voice): A mysterious, wispy ancient wizard who calls you "Traveler"
   - **SciFi Robot** (Kore voice): A futuristic robot who calls you "Captain" with analytical precision
   - **Commander** (Charon voice): A stern military commander who calls you "Soldier" with authority

3. **Proactive Assistance**: The assistant can speak spontaneously when it has something useful to say, without waiting for explicit user prompts.

4. **Google Grounding**: Uses real-time information from Google Search to provide up-to-date game knowledge.

---

## How It Works Technically

### Architecture Overview

The application consists of two main components:

```
[React Frontend] <--WebSocket--> [Python Proxy Server] <--WSS--> [Gemini Live API]
```

### Backend (Python WebSocket Proxy)

**File**: `/home/nik/gemini-live-3d-bridge/examples/gaming-assistant-demo-app/server.py`

The Python backend acts as a secure WebSocket proxy between the frontend and Google's Gemini Live API:

1. **Authentication**: Uses Google Cloud Application Default Credentials (`gcloud auth application-default login`) to generate OAuth bearer tokens automatically.

2. **WebSocket Proxy**: Creates a bidirectional proxy that:
   - Accepts WebSocket connections from the frontend on port 8080
   - Establishes a secure WSS (WebSocket Secure) connection to `us-central1-aiplatform.googleapis.com`
   - Forwards messages bidirectionally between client and Gemini API

3. **Key Technical Details**:
   - Uses `websockets` library for async WebSocket handling
   - SSL context with certifi certificates for secure Google Cloud connections
   - Handles connection lifecycle (setup, data transfer, closure)

### Frontend (React + JavaScript)

#### Main Application (`App.jsx`)

The main component manages:
- Persona selection (Wise Wizard, SciFi Robot, Commander)
- Connection state (Connect/Disconnect)
- Media streaming controls (Microphone, Screen Share)
- Video preview display

#### Gemini Live API Client (`gemini-api.js`)

**File**: `/home/nik/gemini-live-3d-bridge/examples/gaming-assistant-demo-app/src/utils/gemini-api.js`

The `GeminiLiveAPI` class is the core client that:

1. **WebSocket Connection**: Connects to the Python proxy server using standard WebSocket API.

2. **Session Setup**: Sends a comprehensive setup message containing:
   - Model URI: `projects/{projectId}/locations/us-central1/publishers/google/models/gemini-live-2.5-flash-native-audio`
   - Generation config: temperature, response modalities (AUDIO), voice selection
   - System instructions (persona prompt)
   - Proactivity settings
   - Activity detection parameters (silence duration, sensitivity)
   - Function declarations (for tool use)

3. **Message Handling**: Parses various response types:
   - `TEXT`: Plain text responses
   - `AUDIO`: PCM audio data (base64 encoded)
   - `INPUT_TRANSCRIPTION`: What the user said
   - `OUTPUT_TRANSCRIPTION`: What the AI said
   - `TOOL_CALL`: Function invocation requests
   - `SETUP_COMPLETE`, `TURN_COMPLETE`, `INTERRUPTED`: State signals

4. **Sending Media**: Methods to send:
   - Text messages (`sendTextMessage`)
   - Audio data (`sendAudioMessage` - PCM16 base64)
   - Image data (`sendImageMessage` - JPEG base64)
   - Tool responses (`sendToolResponse`)

#### Media Utilities (`media-utils.js`)

**File**: `/home/nik/gemini-live-3d-bridge/examples/gaming-assistant-demo-app/src/utils/media-utils.js`

Four main classes handle media capture and playback:

1. **AudioStreamer**:
   - Captures microphone input using Web Audio API
   - Uses AudioWorklet (`capture.worklet.js`) for low-latency processing
   - Converts Float32 to PCM16 format
   - Samples at 16kHz (Gemini requirement)
   - Sends base64-encoded PCM to Gemini

2. **VideoStreamer** (extends BaseVideoCapture):
   - Captures camera feed via `getUserMedia`
   - Captures frames at configurable FPS (default 1 fps)
   - Encodes as JPEG at 80% quality
   - Sends base64 images to Gemini

3. **ScreenCapture** (extends BaseVideoCapture):
   - Uses `getDisplayMedia` API for screen capture
   - Captures at 720p (1280x720) default
   - Sends JPEG frames to Gemini for multimodal understanding

4. **AudioPlayer**:
   - Receives PCM audio from Gemini (24kHz sample rate)
   - Uses AudioWorklet (`playback.worklet.js`) for playback
   - Converts PCM16 back to Float32
   - Includes volume control and interrupt capability

#### Custom Tools (`tools.js`)

**File**: `/home/nik/gemini-live-3d-bridge/examples/gaming-assistant-demo-app/src/utils/tools.js`

Two example function calling tools:

1. **ShowAlertTool**: Displays browser alert dialogs
2. **AddCSSStyleTool**: Injects CSS styles into the page dynamically

When Google Grounding is disabled, these tools can be enabled to demonstrate Gemini's function calling capabilities.

---

## What's Cool About This Demo

### 1. True Multimodal Real-time Interaction

The demo showcases one of the most advanced features of modern AI: **simultaneous audio and video input processing**. The AI can see what you're playing and hear you speak, enabling context-aware responses like:
- "That boss you're fighting is weak to fire magic!"
- "You're running low on health potions - there's a merchant just north of your current location."

### 2. Persona-based Prompting

The ability to dynamically switch personas through system instructions demonstrates how developers can create deeply personalized AI experiences. Each persona changes:
- The AI's speaking style and vocabulary
- The voice (Fenrir, Kore, Charon)
- How it addresses the user (Traveler, Captain, Soldier)

This is powerful for building branded or themed applications.

### 3. Native Audio (Not Text-to-Speech)

Unlike traditional chatbots that use TTS, Gemini Live uses **native audio generation** with:
- Multiple prebuilt voices (Puck, Charon, Kore, Fenrir, Aoede)
- Lower latency than TTS approaches
- More natural prosody and expression

### 4. Proactive Audio

The demo enables "proactive audio" - the AI can speak up unprompted when it has useful information. This creates a more natural conversational experience rather than strict request-response patterns.

### 5. Activity Detection

The configurable automatic activity detection shows sophisticated speech processing:
- Silence duration threshold (when to consider user finished speaking)
- Prefix padding (how much context to keep before speech)
- Speech sensitivity settings

This enables natural conversation flow without awkward pauses or premature interruptions.

### 6. Function Calling

The demo shows how Gemini can invoke custom functions in the browser, enabling the AI to:
- Display alerts
- Modify page styles
- Potentially interact with game APIs, databases, or other web services

### 7. Production-Ready Patterns

The code demonstrates several production-ready patterns:
- Proper WebSocket connection management
- AudioWorklet for low-latency media processing
- Bidirectional streaming
- Error handling and cleanup
- Configurable parameters via UI

---

## Configuration Options

The demo exposes numerous Gemini configuration options:

| Option | Description |
|--------|-------------|
| Voice | Puck, Charon, Kore, Fenrir, Aoede |
| Temperature | 0.1 - 2.0 (creativity vs precision) |
| Proactive Audio | Enable spontaneous AI speech |
| Google Grounding | Real-time search knowledge |
| Affective Dialog | Emotional intelligence |
| Activity Detection | Silence duration, sensitivity |

---

## Quick Start

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Authenticate with Google Cloud
gcloud auth application-default login

# 3. Start proxy server
python server.py

# 4. In another terminal, start frontend
npm install
npm run dev

# 5. Open http://localhost:5173
#    - Enter your Project ID
#    - Select a persona
#    - Click Connect
#    - Enable microphone and screen share
```

---

## Summary

This demo is a comprehensive showcase of the Gemini Live API's capabilities, demonstrating real-time multimodal AI interaction with native audio, persona-based prompting, proactive assistance, and function calling. It's an excellent reference for building gaming assistants, educational tutors, accessibility tools, or any application requiring natural voice interaction with visual context.
