# Voidpilot — Agent Instructions

## Project Snapshot

Voidpilot is a web-based Gemini Live assistant:

- **Web**: React frontend served by FastAPI in production
- **Backend**: FastAPI relays Gemini Live audio/text streams

## Quick Start

1. Generate your `GOOGLE_API_KEY` and place it in the `.env` file at the root of the project. This is required by `pydantic-settings` to start the backend.

### Running the App
- **Backend:** `uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000`
- **Frontend:** `cd frontend && npm run dev`
- **Combined dev:** `bash dev.sh` (note: Bash environment required for `dev.sh`)

### Testing and Linting
- **Backend Tests:** `uv run pytest tests/ -v`
- **Backend Type Check:** `uv run mypy src/`
- **Backend Lint:** `uv run ruff check src/`
- **Frontend Build/Lint:** `cd frontend && npm run lint && npm run build`

## UI Architecture

- **shadcn/ui**: Used as the primary component library (Radix primitives + Tailwind).
- **framer-motion**: Used for animations and layout transitions.
- **Tailwind v4**: Used for styling.
- **Components**: The UI is divided into semantic components like `ChatArea`, and modular landing page sections.

## Stack

- **Backend**: FastAPI, Python 3.12+, `google-genai`, `pydantic-settings`
- **Frontend**: React 19, Vite 7, Tailwind v4, React Router
- **Testing**: `pytest`, `pytest-asyncio`
- **Package management**: `uv` for Python, `npm` for frontend

## Important Entry Points

- `src/app/main.py`: FastAPI app, CORS, `/health`, static serving for `frontend/dist`
- `src/app/api/v1/router.py`: `/api/v1/hello` plus websocket routers
- `src/app/api/v1/endpoints/live.py`: primary live assistant websocket
- `src/app/api/v1/endpoints/brainstorm.py`: brainstorm mode with artifact/image/Flash tools
- `src/app/api/v1/endpoints/walkthrough.py`: voice walkthrough mode with custom system prompt
- `src/app/services/gemini_audio.py`: shared Gemini Live session wrapper, tool execution, transcriptions, resumption
- `src/app/services/flash_worker.py`: brainstorm helper for markdown/image generation
- `frontend/src/main.tsx`: React app entry with HashRouter
- `frontend/src/pages/LandingPage.tsx`: main landing page
- `frontend/src/pages/BrainstormPage.tsx`: brainstorm workspace and ZIP export
- `frontend/src/components/WalkthroughModal.tsx`: walkthrough voice modal
- `frontend/src/hooks/useGeminiLive.ts`: primary live transport hook
- `frontend/src/hooks/useGeminiBrainstorm.ts`: brainstorm transport and artifact management

## Routes And Modes

### Backend Routes
- `GET /health`
- `GET /api/v1/hello`
- `WS /api/v1/live/live`: main live assistant
- `WS /api/v1/live/brainstorm`: brainstorm mode
- `WS /api/v1/live/walkthrough`: walkthrough mode
- `WS /api/v1/live/ping`

### Frontend Routes
- `/` -> `LandingPage`
- `/brainstorm` -> `BrainstormPage`

## Mode Details

### Live Mode (`/api/v1/live/live`)
The default voice assistant mode. Connect via WebSocket and have natural voice conversations with Gemini Live. Includes default weather tooling.

### Brainstorm Mode (`/api/v1/live/brainstorm`)
Creative workspace for generating multimedia content:
- **Tools**: `save_brainstorm_artifact` (markdown), `generate_brainstorm_image` (Veo images), `delegate_to_flash` (Flash model delegation)
- **Features**: Artifact management, session resumption, Flash model selection
- **Frontend**: Pixel-art office visualization with animated Gemini/Flash agents, workspace panel for viewing/downloading artifacts

### Walkthrough Mode (`/api/v1/live/walkthrough`)
Voice-guided exploration mode:
- **System Prompt**: Customizable via query parameters (`?system_prompt=...`)
- **Tools**: None exposed (voice-only interaction)

## Architecture Notes

- The backend mounts `frontend/dist` at `/` only when that directory exists.
- `GeminiLive` enables audio responses, input/output transcription, context compression, and session resumption.
- Backend websocket endpoints currently create `GeminiLive(..., input_sample_rate=16000)`.
- Renderer audio playback utilities use `24000` Hz, while mic capture is resampled to `16000` Hz before sending.
- Brainstorm mode uses `save_brainstorm_artifact`, `generate_brainstorm_image`, and `delegate_to_flash`.

## Environment Setup

Create a `.env` file in the repository root:
```env
GOOGLE_API_KEY=your_api_key_here
```
This is required by `pydantic-settings` via `src/app/core/config.py`. Missing or empty strings will cause validation failures at boot.

## Conventions

- Python uses Ruff with line length `88`, target `py312`, rules `E,W,F,I,C,B,UP`.
- Pytest uses `asyncio_mode = "auto"` and `testpaths = ["tests"]`.
- Python imports are absolute from `src.app.*`.
- Frontend linting uses ESLint flat config with React Hooks and React Refresh plugins.

## Agent Guardrails

1. If you change websocket paths or message formats, update both backend endpoints and the frontend hooks/components that consume them.
2. Do not add or duplicate hardcoded secrets. Use env-based config.
3. When editing brainstorm or walkthrough flows, preserve their mode-specific prompts, tool sets, and session behavior.
4. Add or update tests when changing websocket behavior, tool handling, session resumption, or brainstorm/walkthrough flows.
