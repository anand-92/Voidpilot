<coding_guidelines>
For comprehensive architecture details, UI patterns, IPC boundaries, and testing instructions, ALWAYS refer to `AGENTS.md`.

## Quick Start & Context

This project uses an AI agent flow via Gemini Live, with a FastAPI backend and an Electron/Vite/React frontend.

### Pre-requisites
1. Generate your `GOOGLE_API_KEY` and place it in the `.env` file at the root of the project. This is required by `pydantic-settings` to start the backend.

### Running the App
- **Backend:** `uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000`
- **Frontend/Desktop:** `cd frontend && npm run dev`
- **Combined dev:** `bash dev.sh` (note: Bash environment required for `dev.sh`)

### Testing and Linting
To verify your changes:
- **Backend Tests:** `uv run pytest tests/ -v`
- **Backend Type Check:** `uv run mypy src/`
- **Backend Lint:** `uv run ruff check src/`
- **Frontend Build/Lint:** `cd frontend && npm run lint && npm run build`
- **Frontend Smoke Test:** `cd frontend && npx playwright test tests/electron.spec.ts`

For a deeper dive into how our frontend uses `shadcn/ui`, `framer-motion`, and React components, or how to navigate the Electron IPC and `nodeIntegration` boundaries, read `AGENTS.md`.
</coding_guidelines>
