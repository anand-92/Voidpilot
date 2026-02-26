# Gemini Live 3D Bridge

Real-time multimodal (audio/text) bridge between a React + Three.js frontend and the Google Gemini Multimodal Live API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) (async) |
| AI SDK | [google-genai](https://pypi.org/project/google-genai/) 1.64.0+ |
| Frontend | React 19 + Three.js + [TailwindCSS v4](https://tailwindcss.com/) (Vite) |
| Package Mgmt | [uv](https://github.com/astral-sh/uv) (backend), npm (frontend) |
| Tooling | [Ruff](https://github.com/astral-sh/ruff) (lint/format), [Pytest](https://docs.pytest.org/) |

## Architecture

### Authentication: Google Cloud API

This project uses **Google Cloud Vertex AI** for Gemini Live connections:

1. Backend WebSocket (`/api/v1/live/live`) receives audio from frontend
2. Backend relays audio to Gemini Live API via Google Cloud
3. Gemini responds with audio, backend relays back to frontend
4. Voice is set to **Charon** (male, informative)

Uses model `gemini-live-2.5-flash-native-audio` on Google Cloud.

### Backend (`src/app/`)

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI entry point — CORS, routers |
| `api/v1/endpoints/live.py` | WebSocket endpoint (`/live`) for Gemini audio relay |
| `services/gemini_audio.py` | Gemini Live connection using Google Cloud API |
| `services/ephemeral_token.py` | (Unused) Ephemeral token creation |
| `core/config.py` | Settings via `pydantic-settings` |
| `schemas/` | Pydantic request/response models |

### Frontend (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `App.tsx` | Root component |
| `components/` | Three.js visualizer and UI components |
| `hooks/useGeminiLive.ts` | Gemini Live connection via backend WebSocket |

## Commands

```bash
# Full dev environment (backend :8000 + frontend :5173)
./dev.sh

# Backend only
uv sync                                      # install deps
uv run uvicorn src.app.main:app --reload      # start server

# Frontend only
cd frontend && npm install && npm run dev

# Tests
PYTHONPATH=. uv run pytest                    # all tests

# Lint / Format
uv run ruff check .
uv run ruff format .

# Docker
docker compose up --build
```

## Conventions

- **Async-first**: `async/await` for all I/O (API calls, WebSockets).
- **Type-safe**: Python type hints + Pydantic models everywhere.
- **Modular**: Maintain the established directory structure when adding features.
- **Testing**: `pytest-asyncio` in `tests/`.
- **Linting**: Ruff config in `ruff.toml` (line length 88, Python 3.12).
- **Secrets**: `GOOGLE_API_KEY` and other secrets in `.env` (loaded via `Settings`).

## Key Files

| File | Purpose |
|------|---------|
| `.env` | Local environment variables (API keys) |
| `pyproject.toml` | Python dependencies and tool config |
| `dev.sh` | Unified dev launcher (backend + frontend) |
| `Dockerfile` / `docker-compose.yml` | Containerization |
| `GEMINI.md` | This file - project documentation |
