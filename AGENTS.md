# Voidpilot — Agent Instructions

## Project Overview

An Electron desktop assistant (codename **Voidpilot**) that connects your screen and microphone directly to **Gemini Live** via the Gemini API. Uses `@midscene/computer` so Gemini can execute UI actions on the host OS based on voice requests and screen awareness.

Also runs as a **web app** (no Electron) when deployed to Cloud Run — the React frontend is served by the FastAPI backend as static files.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | **FastAPI** (async, Python 3.12+) | WebSocket relay for Gemini Live API |
| AI SDK | **google-genai ≥ 1.65.0** | Live API connection, ephemeral tokens |
| Frontend | **React 19 + Vite 7 + TailwindCSS v4** | HashRouter, two routes: Landing `/` and App `/app` |
| Desktop | **Electron 40** | Screen capture via `desktopCapturer`, OS automation via Midscene |
| OS Automation | **@midscene/computer** | Click, type, navigate — called through Electron IPC |
| Package Mgmt | **uv** (backend), **npm** (frontend) |
| Deployment | **Docker** multi-stage → **Google Cloud Run** |

---

## Project Structure

```
gemini-live-3d-bridge/
├── src/                         # Python backend
│   └── app/
│       ├── main.py              # FastAPI entry, CORS, static serving
│       ├── core/
│       │   └── config.py        # Pydantic settings (GOOGLE_API_KEY, etc.)
│       ├── api/v1/
│       │   ├── router.py        # /api/v1 router, /hello endpoint
│       │   └── endpoints/
│       │       └── live.py      # WebSocket at /api/v1/live/ws (Gemini relay)
│       ├── schemas/
│       │   └── msg.py           # Pydantic models
│       └── services/
│           ├── gemini_audio.py  # GeminiLive class — session lifecycle, tool handling, audio/video/text streams
│           └── ephemeral_token.py # Token generation for direct frontend→Gemini connections
├── frontend/                    # React + Vite + Electron
│   ├── main.ts                  # Electron main process (desktopCapturer, Midscene agent, ghost cursor)
│   ├── preload.ts               # Electron preload (IPC bridge: ping, desktop sources, Midscene actions)
│   ├── vite.config.ts           # Vite config with Electron plugin, TailwindCSS, API proxy
│   ├── src/
│   │   ├── main.tsx             # HashRouter — routes: / (Landing), /app (App)
│   │   ├── App.tsx              # Live session UI — connect/disconnect, messages, text input
│   │   ├── pages/
│   │   │   └── LandingPage.tsx  # Marketing landing — capabilities, quick start
│   │   └── hooks/
│   │       └── useGeminiLive.ts # WebSocket hook — audio capture, PCM16 encoding, playback
│   └── package.json
├── Dockerfile                   # Multi-stage: Node build → Python runtime, port 8080
├── pyproject.toml               # Python deps (uv managed)
├── dev.sh                       # Launches both backend + frontend for local dev (Linux/Mac)
├── .env                         # GOOGLE_API_KEY (required)
└── tests/                       # pytest tests
```

---

## Key Architecture Details

### Backend (FastAPI)

- **Entry**: `src/app/main.py` — sets up CORS (allow all origins), mounts API router at `/api/v1`, serves `frontend/dist` as static files in production.
- **WebSocket endpoint**: `GET /api/v1/live/ws` — accepts browser WebSocket, creates a `GeminiLive` session, relays audio/video/text bidirectionally.
- **`GeminiLive` class** (`services/gemini_audio.py`):
  - Connects to Gemini using `google-genai` SDK
  - Handles audio input/output queues, video frames, text messages
  - Supports **tool calling** (e.g., `get_weather`, `execute_midscene_action`)
  - Weather tool uses Open-Meteo API (free, no key needed)
- **Config**: `pydantic-settings` reads `.env` file. Key setting: `GOOGLE_API_KEY`.

### Frontend (React + Electron)

- **`useGeminiLive` hook**: Core logic — manages WebSocket connection to backend, captures microphone audio (ScriptProcessorNode), processes PCM16 encoding/decoding, handles audio playback via AudioContext.
- **WebSocket URL detection**: Automatically uses `ws://127.0.0.1:8000` in Electron or `ws(s)://current-host` in browser.
- **Electron main process** (`main.ts`):
  - **Ghost cursor**: Transparent overlay window showing where AI will click
  - **Midscene agent**: Executes OS-level actions (click, type) based on Gemini tool calls
  - **Interruptible**: Mouse movement or speech aborts in-progress automations
  - **Screen capture**: 1fps via `desktopCapturer`, sent as video frames to Gemini

### Deployment (Docker / Cloud Run)

- Multi-stage Dockerfile:
  1. **Stage 1**: `node:22-alpine` — builds React app via `npm run build`
  2. **Stage 2**: `python:3.12-slim` — installs `uv`, syncs Python deps, copies built frontend
- Runs on port **8080** (Cloud Run default)
- `CMD`: `uv run uvicorn src.app.main:app --host 0.0.0.0 --port 8080`

---

## Local Development

```bash
# 1. Install Python deps
uv sync

# 2. Install Node deps
cd frontend && npm install && cd ..

# 3. Create .env
echo "GOOGLE_API_KEY=your_key" > .env

# 4a. Start backend
uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000

# 4b. Start frontend (in another terminal)
cd frontend && npm run dev

# OR use the unified script (Linux/Mac only)
bash dev.sh
```

- Frontend dev server runs at `http://localhost:5173`, proxies `/api` → `http://127.0.0.1:8000`
- Electron window opens automatically in dev mode

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | **Yes** | Google AI API key for Gemini Live access |

---

## Coding Conventions

- **Python**: Ruff linter, line length 88, target Python 3.12. Rules: E, W, F, I, C, B, UP.
- **TypeScript**: ESLint with react-hooks and react-refresh plugins.
- **Testing**: pytest with asyncio_mode=auto. Test directory: `tests/`.
- **Imports**: Python uses absolute imports from `src.app.*`.

---

## Cloud Run Deployment

```bash
# Deploy via gcloud
gcloud run deploy voidpilot \
  --source . \
  --project gen-lang-client-0579048282 \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_key
```

The Dockerfile handles the full build. The backend serves the React frontend as static files at `/`.

---

## Important Notes for Agents

1. **Don't modify Electron files** when working on Cloud Run deployment — Electron features (Midscene, desktopCapturer) are desktop-only.
2. **WebSocket path**: Frontend connects to `/api/v1/live/ws` — this must match the backend route.
3. **Audio format**: PCM16 at 24kHz sample rate — both encoding and decoding.
4. **Static file serving**: Backend checks for `frontend/dist` directory and mounts it at `/` — this is how the web version works in production.
5. **The `.env` file must exist** with `GOOGLE_API_KEY` for the backend to connect to Gemini.
6. **npm install** works without `--legacy-peer-deps` — peer deps are resolved cleanly.
