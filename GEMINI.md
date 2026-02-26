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

### Backend (`src/app/`)

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI entry point — CORS, routers |
| `api/v1/live.py` | WebSocket endpoint (`/ws`) for the Gemini Live bridge |
| `services/gemini_live.py` | Core `google-genai` async session and bidirectional streaming |
| `core/config.py` | Settings via `pydantic-settings` |
| `schemas/` | Pydantic request/response models |

### Frontend (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `App.tsx` | Root component |
| `components/` | Three.js visualizer and UI components |
| `hooks/` | Custom hooks (e.g., `useGeminiLive`) |

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
