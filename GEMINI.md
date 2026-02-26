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

### Authentication: Ephemeral Tokens

This project uses **ephemeral tokens** for direct client-to-Gemini connections:

1. Frontend requests an ephemeral token from backend: `POST /api/v1/live/token`
2. Backend generates a short-lived token (30 min for messages, 1 min for new sessions)
3. Frontend connects directly to Gemini Live API using the token
4. This reduces latency by eliminating the backend proxy for audio streaming

The token is locked to the model `gemini-2.5-flash-native-audio-preview-12-2025` for security.

### Backend (`src/app/`)

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI entry point — CORS, routers |
| `api/v1/endpoints/live.py` | REST endpoint (`/token`) for ephemeral tokens, WebSocket endpoint (`/ws`) for fallback |
| `services/ephemeral_token.py` | Ephemeral token creation using Google GenAI SDK |
| `services/gemini_live.py` | Core `google-genai` async session and bidirectional streaming (for proxy mode) |
| `core/config.py` | Settings via `pydantic-settings` |
| `schemas/` | Pydantic request/response models |

### Frontend (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `App.tsx` | Root component |
| `components/` | Three.js visualizer and UI components |
| `hooks/useGeminiLive.ts` | Gemini Live connection with ephemeral token support |

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
uv run python tests/test_gemini_live.py       # live integration test

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
| `tests/test_gemini_live.py` | WebSocket bridge integration test |
| `GEMINI.md` | This file - project documentation |
