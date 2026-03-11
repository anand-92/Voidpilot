# Voidpilot — Agent Instructions

## Project Snapshot

Voidpilot is a Gemini Live assistant with two runtimes:

- **Desktop**: Electron + React + FastAPI + `@midscene/computer`
- **Web**: React frontend served by FastAPI in production

The backend relays Gemini Live audio/video/text streams. Desktop mode adds screen capture, region selection, Midscene automation, and approval-gated shell execution.


## UI Architecture

- **shadcn/ui**: Used as the primary component library (Radix primitives + Tailwind).
- **framer-motion**: Used for animations and layout transitions.
- **Tailwind v4**: Used for styling. Note the specific v4 patterns if applicable.
- **Components**: The UI is divided into semantic components like `ScreenSharePanel`, `ChatArea`, and modular landing page sections to avoid god-components.

## Stack

- **Backend**: FastAPI, Python 3.12+, `google-genai`, `pydantic-settings`
- **Frontend**: React 19, Vite 7, Tailwind v4, React Router
- **Desktop**: Electron 40, preload IPC bridge, `@midscene/computer`
- **Testing**: `pytest`, `pytest-asyncio`, Playwright Electron smoke test
- **Package management**: `uv` for Python, `npm` for frontend

## Important Entry Points

- `src/app/main.py`: FastAPI app, CORS, `/health`, static serving for `frontend/dist`
- `src/app/api/v1/router.py`: `/api/v1/hello` plus websocket routers
- `src/app/api/v1/endpoints/live.py`: primary live assistant websocket
- `src/app/api/v1/endpoints/brainstorm.py`: brainstorm mode with artifact/image/Flash tools
- `src/app/api/v1/endpoints/walkthrough.py`: voice walkthrough mode with custom system prompt
- `src/app/services/gemini_audio.py`: shared Gemini Live session wrapper, tool execution, transcriptions, resumption
- `src/app/services/bash_agent.py`: Gemini-driven shell-task planner for the live mode
- `src/app/services/flash_worker.py`: brainstorm helper for markdown/image generation
- `frontend/main.ts`: Electron main process, Midscene lifecycle, ghost cursor, region selector, `run-bash`
- `frontend/preload.ts`: desktop IPC surface exposed to the renderer
- `frontend/src/main.tsx`: runtime-dependent router
- `frontend/src/App.tsx`: desktop live UI
- `frontend/src/pages/BrainstormPage.tsx`: brainstorm workspace and ZIP export
- `frontend/src/components/WalkthroughModal.tsx`: walkthrough voice modal
- `frontend/src/hooks/useGeminiLive.ts`: primary live transport hook

## Current Routes And Modes

- `GET /health`
- `GET /api/v1/hello`
- `WS /api/v1/live/live`: main live assistant
- `WS /api/v1/live/brainstorm`: brainstorm mode
- `WS /api/v1/live/walkthrough`: walkthrough mode
- `WS /api/v1/live/ping`

Frontend routing is **runtime-dependent**:

- In Electron: `/` -> `App`, `/brainstorm` -> `BrainstormPage`
- In browser/web: `/` -> `LandingPage`, `/brainstorm` -> `BrainstormPage`
- There is currently **no `/app` route**


## IPC Boundaries

- **`frontend/preload.ts`**: The exclusive bridge exposing `window.electron` and `window.bash` to the React renderer.
- **Node Integration**: Disabled globally in the main browser window for security. Only explicitly enabled in the `region-selector` overlay where `contextIsolation: false` is intentionally used.
- **`run-bash`**: The shell execution IPC event requires a native main process confirmation dialog (`dialog.showMessageBox` in `main.ts`). **Do not** attempt to render this confirmation securely in the web layer.

## Architecture Notes That Matter

- The backend mounts `frontend/dist` at `/` only when that directory exists.
- `GeminiLive` enables audio responses, input/output transcription, context compression, and session resumption.
- Backend websocket endpoints currently create `GeminiLive(..., input_sample_rate=16000)`.
- Renderer audio playback utilities use `24000` Hz, while mic capture is resampled to `16000` Hz before sending.
- Live mode includes default weather tooling plus `execute_midscene_action`, `bash_agent`, and `confirm_bash`.
- Brainstorm mode disables default tools and uses `save_brainstorm_artifact`, `generate_brainstorm_image`, and `delegate_to_flash`.
- Walkthrough mode is voice-focused and does not expose custom tools.
- Desktop screen sharing is optional and Electron-only: display selection -> optional region selection -> cropped/scaled JPEG frames.
- Midscene is interruptible by loud user speech and physical mouse movement during planning.
- Electron `run-bash` executes commands through `/bin/bash` with explicit user approval. Treat this as Unix-shell-specific behavior.
- The region-selector overlay intentionally uses `nodeIntegration: true` and `contextIsolation: false`. Do not broaden that pattern elsewhere without a strong reason.


## Environment Setup

Create a `.env` file in the repository root containing at least:
```env
GOOGLE_API_KEY=your_api_key_here
```
This is required by `pydantic-settings` via `src/app/core/config.py`. Missing or empty strings will cause validation failures at boot.

## Development Commands

```bash
# backend
uv sync
uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000

# frontend
cd frontend && npm install
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm run build:electron

# combined dev helper (bash-oriented)
bash dev.sh

# tests / lint / type checking
uv run pytest tests/ -v
uv run ruff check src/
uv run mypy src/

# frontend e2e smoke test (Playwright)
cd frontend && npx playwright test tests/electron.spec.ts
```

Notes:

- `dev.sh` is Bash-specific and kills ports `8000` and `5173` before starting both services.
- A Playwright Electron smoke test exists at `frontend/tests/electron.spec.ts`, but there is no dedicated npm test script wired for it.

## Conventions

- Python uses Ruff with line length `88`, target `py312`, rules `E,W,F,I,C,B,UP`.
- Pytest uses `asyncio_mode = "auto"` and `testpaths = ["tests"]`.
- Python imports are absolute from `src.app.*`.
- Frontend linting uses ESLint flat config with React Hooks and React Refresh plugins.

## Agent Guardrails

1. If you change websocket paths or message formats, update both backend endpoints and the frontend hooks/components that consume them.
2. If you touch desktop functionality, keep `frontend/main.ts`, `frontend/preload.ts`, and renderer calls in sync.
3. For Cloud Run or web-only work, avoid unnecessary Electron changes.
4. Do not add or duplicate hardcoded secrets. This repo already has secret-management debt; prefer env-based config and avoid spreading it further.
5. Treat shell execution carefully: the live assistant's bash flow is approval-gated and currently assumes `/bin/bash`.
6. When editing brainstorm or walkthrough flows, preserve their mode-specific prompts, tool sets, and session behavior.
7. Add or update tests when changing websocket behavior, tool handling, session resumption, or brainstorm/walkthrough flows. The backend test suite already covers several of these paths.
