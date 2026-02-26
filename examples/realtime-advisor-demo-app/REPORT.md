# Real-time Advisor Demo - Technical Report

## Overview

The **Real-time Advisor Demo** is a sophisticated React application that demonstrates how to build an AI-powered business advisor using the Google Gemini Multimodal Live API. This demo showcases advanced capabilities like proactive audio responses, custom function calling, voice activity detection, and precise interruption control.

## What This Demo Does

The application simulates a business advisor that listens to conversations and provides relevant insights based on a configurable knowledge base. It demonstrates two distinct interaction modes:

1. **Silent Mode**: The advisor listens passively and pushes visual information via a modal dialog without speaking. This is ideal for unobtrusive, background assistance.

2. **Outspoken Mode**: The advisor actively interjects into the conversation to verbally offer advice while also displaying visual data through modal dialogs.

Users can dynamically inject business data (revenue figures, employee counts, etc.) into the advisor's knowledge base through the UI, and the AI will respond to questions based on this injected information.

## Technical Architecture

### System Components

The demo consists of three main layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ App.jsx     │  │ LiveAPIDemo  │  │ gemini-api.js           │ │
│  │ (Layout)    │  │ (Main UI)    │  │ (WebSocket Client)      │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ tools.js    │  │ media-utils  │  │ Audio Worklets          │ │
│  │ (Functions) │  │ (A/V Streaming│  │ (PCM Processing)        │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ WebSocket (ws://localhost:8080)
┌───────────────────────────┴─────────────────────────────────────┐
│                     Python Backend (server.py)                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  - Google Cloud authentication (default credentials)       ││
│  │  - WebSocket proxy to Gemini API                           ││
│  │  - Bidirectional message forwarding                        ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────────┘
                            │ WSS (SSL)
┌───────────────────────────┴─────────────────────────────────────┐
│                   Google Cloud Vertex AI                        │
│              (gemini-live-2.5-flash-native-audio)              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Source Files

| File | Purpose |
|------|---------|
| `server.py` | Python WebSocket proxy server handling Google Cloud authentication |
| `src/utils/gemini-api.js` | Core Gemini Live API client with WebSocket connection and message handling |
| `src/components/LiveAPIDemo.jsx` | Main UI component with all controls and configuration |
| `src/utils/media-utils.js` | Audio/Video streaming and playback utilities |
| `src/utils/tools.js` | Custom function definitions for tool calling |
| `public/audio-processors/capture.worklet.js` | Audio capture worklet for microphone input |
| `public/audio-processors/playback.worklet.js` | Audio playback worklet for speaker output |

## How It Works Technically

### 1. WebSocket Connection Flow

The connection establishes through a proxy architecture:

1. **Frontend** connects to local Python proxy at `ws://localhost:8080`
2. **Python server** authenticates with Google Cloud using default credentials
3. **Python server** establishes secure WebSocket to `wss://us-central1-aiplatform.googleapis.com`
4. **Bidirectional proxy** forwards messages between frontend and Gemini API

### 2. Session Setup

When connecting, the client sends a comprehensive setup message (`src/utils/gemini-api.js` lines 309-332):

```javascript
{
  setup: {
    model: "projects/{projectId}/locations/us-central1/publishers/google/models/gemini-live-2.5-flash-native-audio",
    generation_config: {
      response_modalities: ["AUDIO"],
      temperature: 1.0,
      speech_config: {
        voice_config: { prebuilt_voice_config: { voice_name: "Puck" } }
      },
      enable_affective_dialog: true
    },
    system_instruction: { parts: [{ text: "You are listening to a conversation..." }] },
    tools: { function_declarations: [...] },
    proactivity: { proactiveAudio: true },
    realtime_input_config: {
      automatic_activity_detection: { ... },
      activity_handling: "NO_INTERRUPTION"
    }
  }
}
```

### 3. Audio Pipeline

**Capture (Microphone to Gemini):**
- Uses `AudioWorklet` at 16kHz sample rate (Gemini requirement)
- `capture.worklet.js` processes raw audio
- Converts Float32 to PCM16, then to base64
- Sends via `client.sendAudioMessage(base64Audio)`

**Playback (Gemini to Speaker):**
- Gemini outputs audio at 24kHz
- `AudioPlayer` class handles playback at matching sample rate
- `playback.worklet.js` manages real-time audio rendering
- Includes volume control and interrupt handling

### 4. Video/Screen Streaming

- Captures frames as JPEG (configurable quality)
- Sends at configurable FPS (default: 1 fps to minimize bandwidth)
- Supports both camera input and screen sharing
- Frames sent via `client.sendImageMessage(base64, "image/jpeg")`

### 5. Custom Function Calling

Two custom tools demonstrate tool use:

**ShowModalDialogTool** (`tools.js`):
```javascript
{
  name: "show_modal",
  description: "Displays a large modal dialog with a message",
  parameters: {
    message: "string - The message to display",
    title: "string - Optional title"
  }
}
```

**AddCSSStyleTool** (`tools.js`):
```javascript
{
  name: "add_css_style",
  description: "Injects CSS styles with !important flag",
  parameters: {
    selector: "CSS selector",
    property: "CSS property",
    value: "property value"
  }
}
```

When Gemini calls a tool, the `handleMessage` function in `LiveAPIDemo.jsx` processes the tool call and executes the corresponding JavaScript function.

### 6. System Instructions Control

The advisor behavior is controlled through dynamic system instructions:

```
You are listening to a conversation. Your goal is to help the user...

Knowledge Base:
{user-configured business data}

Instructions:
1. Listen to the conversation.
2. If you hear a question that can be answered by the knowledge base:
   [Silent Mode]: Call "show_modal" tool. Do NOT speak.
   [Outspoken Mode]: Speak the answer AND call "show_modal" tool.
3. If unanswerable, remain silent.
```

### 7. Activity Detection & Interruption Control

The demo exposes fine-grained control over voice activity detection:

- **Silence Duration**: How long to wait before detecting end of speech (500-10000ms)
- **Prefix Padding**: How much audio to include before speech starts (0-2000ms)
- **End/Start Sensitivity**: Sensitivity thresholds for speech detection
- **Activity Handling**:
  - `START_OF_ACTIVITY_INTERRUPTS`: Allows user to barge-in
  - `NO_INTERRUPTION`: Prevents interruption (critical for advisor role)

## What's Cool About This Demo

### 1. Proactive Audio

The demo enables `proactiveAudio`, allowing Gemini to initiate responses without waiting for user input. The advisor can spontaneously offer insights when it detects relevant conversation topics.

### 2. Dual-Mode Interaction

The ability to seamlessly switch between silent (visual-only) and outspoken (audio + visual) modes demonstrates the flexibility of the Gemini Live API for different use cases:

- **Silent mode**: Perfect for meeting assistants, note-taking, or unobtrusive help
- **Outspoken mode**: Ideal for tutoring, consulting, or interactive guidance

### 3. Real-time Knowledge Injection

Users can modify the knowledge base in real-time, and the AI immediately uses this new context. This enables:

- Dynamic FAQ systems
- Context-aware assistants
- On-the-fly information updates

### 4. Comprehensive Media Pipeline

The demo handles the complex audio/video processing pipeline:

- **Audio**: 16kHz capture (Gemini requirement) / 24kHz playback (Gemini output)
- **Video**: Configurable FPS and quality
- **Worklets**: Low-latency audio processing in the browser
- **Interruption handling**: Clean audio interrupt for responsive UX

### 5. Fine-grained Activity Control

The `activityHandling` configuration (`NO_INTERRUPTION`) is particularly valuable for this use case. It ensures the advisor can complete its thoughts without being interrupted, mimicking real human advisors who politely finish their points.

### 6. Full-stack Example

The demo encompasses the entire stack:

- **React frontend** with modern hooks and state management
- **Python proxy** with async WebSocket handling
- **Google Cloud** authentication and API integration
- **Web Audio API** for low-latency media processing

This makes it an excellent reference for building production Gemini Live applications.

### 7. Production-Ready Patterns

The code demonstrates several production-ready patterns:

- Proper cleanup of media resources
- Error handling for device access
- Graceful WebSocket reconnection
- Modular utility classes
- Configurable parameters for fine-tuning behavior
