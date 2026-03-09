# Voidpilot Knowledge Base

## Product
- **Name**: Voidpilot
- **Tagline**: "AI that sees, hears, and takes the wheel."
- **What it does**: An Electron desktop assistant that connects your screen and microphone directly to Gemini Live via the Gemini API. Uses @midscene/computer so Gemini can execute UI actions on the host OS. Also runs as a web app on Cloud Run.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (async, Python 3.12+) |
| AI Models | Gemini 2.5 Flash (native audio), Gemini 3.1 Flash Lite (text worker), Gemini 3.1 Flash Image (image gen) |
| Frontend | React 19 + Vite 7 + TailwindCSS v4 |
| Desktop | Electron 40 |
| OS Automation | @midscene/computer |
| Routing | HashRouter — Landing `/`, Brainstorm `/#/brainstorm` |
| Package Mgmt | uv (backend), npm (frontend) |
| Deployment | Docker multi-stage → Google Cloud Run |

## Architecture
- **Backend relay**: FastAPI WebSocket at `/api/v1/live/live` relays audio/video/text between browser and Gemini Live API
- **Brainstorm endpoint**: `/api/v1/live/brainstorm` — dedicated WebSocket with brainstorm system prompt, NON_BLOCKING tools, and Flash Lite/Image workers
- **Two-model pattern**: Gemini Live handles voice conversation, Flash Lite/Image handles background artifact generation
- **Audio**: PCM16 at 24kHz sample rate for encoding/decoding
- **Artifacts**: Pushed to frontend via WebSocket, held in React state, downloaded client-side

## Gemini Models Used
| Model | Purpose |
|-------|---------|
| `gemini-2.5-flash-native-audio-preview-12-2025` | Live API voice conversation |
| `gemini-3.1-flash-lite-preview` | Background text generation (markdown structuring, analysis) |
| `gemini-3.1-flash-image-preview` | Background image generation (concept sketches, diagrams) |

## Brainstorm Mode Tools (all NON_BLOCKING)
| Tool | Scheduling | Purpose |
|------|-----------|---------|
| `save_brainstorm_artifact` | SILENT | Structure raw ideas into markdown document |
| `generate_brainstorm_image` | WHEN_IDLE | Generate visual artifacts |
| `delegate_to_flash` | WHEN_IDLE | General-purpose analysis/research delegation |
