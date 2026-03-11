# User Testing Guide

## Flow Validator Guidance: backend-and-cross-stack
- Surface: Terminal/CLI
- Setup: Use standard python (`uv run ...`) and npm commands to verify.
- Validation: 
  - For VAL-API-001: Run backend (`uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000`), confirm healthcheck `curl http://localhost:8000/health`, then stop it.
  - For VAL-API-002: Run `uv run pytest tests/` and confirm it passes.
  - For VAL-CROSS-001: Run frontend (`npm run dev`) and backend concurrently, verify they don't crash. (Or just rely on healthchecks). In Electron, verify it can be packaged/started or just verify the process doesn't crash on boot.

## Flow Validator Guidance: backend-typecheck
- Surface: Terminal/CLI
- Setup: Python environment with mypy installed.
- Validation: Run uv run mypy src/ and verify it exits with 0 and reports no critical errors.
