# Gemini Project Context: gemini-hackathon

This project is a modern, production-ready Python backend designed to integrate with the **Google Gemini Multimodal Live API**. It serves as a real-time bridge for bidirectional audio and text communication between a client and Gemini's live models.

## Project Overview

- **Purpose**: Real-time multimodal (audio/text) interaction bridge using Gemini 2.0.
- **Main Technologies**:
  - **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Async)
  - **AI SDK**: [google-genai](https://pypi.org/project/google-genai/) (latest 1.64.0+)
  - **Package Manager**: [uv](https://github.com/astral-sh/uv)
  - **Tooling**: [Ruff](https://github.com/astral-sh/ruff) (Linting/Formatting), [Pytest](https://docs.pytest.org/) (Testing)
  - **Frontend**: Simple Glassmorphism UI (Vanilla CSS/JS) served via FastAPI.

## Architecture

- **`src/app/main.py`**: Entry point, configures FastAPI, CORS, static file serving, and includes routers.
- **`src/app/api/v1/`**: Versioned API endpoints.
  - **`live.py`**: WebSocket endpoint (`/ws`) for the Gemini Live bridge.
- **`src/app/services/gemini_live.py`**: Core logic for managing the `google-genai` async session and bidirectional streaming.
- **`src/app/core/config.py`**: Settings management via `pydantic-settings`.
- **`src/app/schemas/`**: Pydantic schemas for data validation and serialization.
- **`src/app/static/`**: Frontend assets (e.g., `index.html`).

## Building and Running

### Commands

- **Initialize/Sync Dependencies**:
  ```bash
  uv sync
  ```
- **Start Development Server**:
  ```bash
  uv run uvicorn src.app.main:app --reload
  ```
- **Run Tests**:
  ```bash
  PYTHONPATH=. uv run pytest
  ```
- **Run Specific Live Test**:
  ```bash
  uv run python tests/test_gemini_live.py
  ```
- **Linting/Formatting**:
  ```bash
  uv run ruff check .
  uv run ruff format .
  ```
- **Docker**:
  ```bash
  docker compose up --build
  ```

## Development Conventions

- **Async First**: Use `async/await` for all I/O operations (API calls, WebSockets).
- **Type Safety**: Leverage Python type hints and Pydantic models for all data structures.
- **Surgical Updates**: When modifying code, maintain the established modular structure.
- **Testing**: Add tests for new features in the `tests/` directory using `pytest-asyncio`.
- **Linting**: Follow the Ruff configuration defined in `ruff.toml` (Standard line length 88, target Python 3.12).
- **Env Vars**: Keep secrets like `GOOGLE_API_KEY` in `.env` (managed via `Settings` class).

## Key Files

- **`.env`**: Local environment variables (API keys).
- **`pyproject.toml`**: Dependency management and tool configuration.
- **`Dockerfile` / `docker-compose.yml`**: Containerization setup.
- **`tests/test_gemini_live.py`**: Integration test for verifying the WebSocket bridge.
