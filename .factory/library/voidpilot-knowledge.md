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

## Gemini API Patterns
- **API version**: All `genai.Client` instances use `http_options={"api_version": "v1beta"}`. This is required for Live API, Flash Lite, and Flash Image models. See `gemini_audio.py`, `flash_worker.py`, `ephemeral_token.py`.
- **Session resumption**: `SessionResumptionConfig` is always included in `LiveConnectConfig` for all `GeminiLive` sessions (not just brainstorm). When `handle=None`, it starts a fresh session. Workers modifying session config should be aware this affects all endpoints.
- **Hardcoded fallback API key**: Multiple endpoints (`live.py`, `walkthrough.py`, `brainstorm.py`) have a hardcoded fallback API key. This is a known tech debt item — new endpoints should follow the same pattern for consistency until it's properly addressed.

## Frontend Artifact Content Format
- **Markdown artifacts**: `brainstorm_artifact` messages carry `content` as raw markdown text (UTF-8 string). Rendered inline via react-markdown, downloadable as-is.
- **Image artifacts**: `brainstorm_image` messages carry `data` as a base64-encoded string. Displayed inline via `data:image/png;base64,...` URIs. For downloads, the base64 string must be decoded to binary before creating Blobs or zip entries — otherwise downloaded files will be corrupt.
- **State**: All artifacts are held in React state (`Map<string, BrainstormArtifact>`) with no server-side storage. Client-side downloads via Blob URLs and JSZip.

## Icon Generation Pipeline
- **Script**: `frontend/scripts/generate-icons.mjs` calls Gemini to generate all icons in `GeminiIcons.tsx`.
- **Limitation**: The script regenerates ALL icons nondeterministically (Gemini output varies per call). Adding a single icon via the full pipeline will change every existing icon's SVG paths.
- **Workaround**: To add a new icon, create a temporary focused script that generates only the needed icon using the same technical requirements (framer-motion, SVGProps, viewBox 0 0 24 24, currentColor, strokeWidth 1.5). Place custom icons in `CustomIcons.tsx`, not `GeminiIcons.tsx`.
- **Custom icons**: Project-specific icons (e.g., `IconBrainstorm`) live in `frontend/src/components/icons/CustomIcons.tsx`, separate from the generated set.

## Brainstorm Mode Tools (all NON_BLOCKING)
| Tool | Scheduling | Purpose |
|------|-----------|---------|
| `save_brainstorm_artifact` | SILENT | Structure raw ideas into markdown document |
| `generate_brainstorm_image` | WHEN_IDLE | Generate visual artifacts |
| `delegate_to_flash` | WHEN_IDLE | General-purpose analysis/research delegation |

- **SDK Object Structure**: The google.genai SDK objects (like GenerateContentResponse and its nested components) are objects, not dictionaries. They lack a .get() method. They must be accessed via object attributes, so dynamically testing via hasattr() and getattr() is required instead of .get().

