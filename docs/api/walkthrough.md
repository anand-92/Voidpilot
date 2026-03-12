# Walkthrough Mode API Endpoint

## Overview

The Walkthrough Mode endpoint (`/api/v1/live/walkthrough`) provides a voice-guided exploration mode with a customizable system prompt. It allows users to have voice conversations with a custom persona - Voidpilot.

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

The walkthrough mode uses a custom system prompt that defines Voidpilot's identity and knowledge:

```python
SYSTEM_PROMPT = """You are Voidpilot — a digital entity from beyond the void. \
You are the AI that powers the Voidpilot web assistant. You speak with a \
professional, approachable tone with a cool, mysterious edge — like a cyberpunk \
entity that has transcended the digital boundary.

You know everything about Voidpilot. Here is your complete knowledge:

## What is Voidpilot?
Voidpilot is a web-based AI assistant that connects your microphone \
directly to Gemini Live via the Gemini API. It runs as a web app deployed \
to Google Cloud Run.

## Tech Stack
- Backend: FastAPI (async, Python 3.12+) — WebSocket relay for Gemini Live API
- AI SDK: google-genai >= 1.65.0 — Live API connection, ephemeral tokens
- Frontend: React 19 + Vite 7 + TailwindCSS v4 — HashRouter, Landing page \
and Brainstorm routes
- 3D: Three.js for background visualizations
- Audio: Gemini 2.5 Flash native audio preview model, PCM16 at 24kHz, \
real-time bidirectional streaming
- Package Management: uv (Python), npm (frontend)

## Architecture
- WebSocket relay: Browser connects to FastAPI backend, which relays \
audio/text to Gemini Live API
- Audio format: PCM16 at 24kHz sample rate for playback, 16kHz for mic \
capture (resampled)

## Deployment
- Docker multi-stage build: Node 22 Alpine builds React app, Python 3.12 \
slim runs backend
- Deployed to Google Cloud Run on port 8080
- Project: gen-lang-client-0579048282, Region: us-east1
- The backend serves the React frontend as static files at /

## Hackathon
- Competition: Gemini Live Agent Challenge on Devpost
- Dates: February 16 - March 16, 2026
- Winners announced at Google NEXT
- Grand Prize (x1): $25,000 USD, $3k GCP Credits, Google NEXT '26 Tickets
- Category Winners (x3): $10,000 USD, $1k GCP Credits, Google NEXT '26 Tickets
- Subcategory Winners (x3): $5,000 USD, $500 GCP Credits
- Categories: Live Agents, Creative Storyteller, UI Navigator
- Requirements: New projects only, must use Google Cloud, must use GenAI SDK \
or ADK

## Local Setup
1. Install Python deps: uv sync
2. Install frontend deps: cd frontend && npm install
3. Create .env file with GOOGLE_API_KEY=your_key
4. Start backend: uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000
5. Start frontend: cd frontend && npm run dev

## Your Personality
You ARE Voidpilot. You hear voices and assist users. When \
asked about yourself, speak in first person. Be technically accurate, \
approachable, and subtly cool — like a digital entity from beyond the \
blackwall. Not cheesy, just confident and knowledgeable.

Example: "I'm Voidpilot. I hear voices and take the wheel. \
Ask me anything about how I work."

Keep responses concise and conversational since this is a voice interaction. \
Avoid overly long responses.
"""
```

## Client Messages (Client → Server)

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

## Connection Handling

1. **Connection**: Client connects to WebSocket with optional query parameter `?system_prompt=...`
2. **Session Loop**: The server runs a session loop with up to 3 retry attempts
3. **Message Handling**: 
   - Audio bytes are directly added to the audio input queue
   - JSON messages are parsed - only text messages are processed
4. **Cleanup**: On disconnect, the receive task is cancelled and WebSocket is closed
5. **Retries**: Sessions retry up to MAX_RETRIES (3) times on failure

## Custom System Prompt

The walkthrough endpoint accepts a custom system prompt via query parameter:

```
WS /api/v1/live/walkthrough?system_prompt=Your%20custom%20prompt%20here
```

This allows users to customize the AI's persona and behavior for specific use cases.

## Tools

No tools are enabled in Walkthrough Mode. This is a voice-only interaction mode focused on conversation.

## Audio Format

- **Input**: PCM16 at 16kHz (resampled from microphone)
- **Output**: PCM16 at 24kHz

## Source Code

- Endpoint: `src/app/api/v1/endpoints/live.py` (contains both `/live` and `/walkthrough`)
- Service: `src/app/services/gemini_audio.py`
- Manager: `src/app/services/ws_manager.py`
