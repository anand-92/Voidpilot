#!/bin/bash
set -e

echo "=== Voidpilot Brainstorm Mode Mission Init ==="

# Install Python deps
cd /Users/dks0662779/gemini-live-3d-bridge
uv sync 2>&1 | tail -5

# Install frontend deps
cd /Users/dks0662779/gemini-live-3d-bridge/frontend
npm install 2>&1 | tail -5

# Verify baseline
echo "=== Verifying baseline ==="
cd /Users/dks0662779/gemini-live-3d-bridge
uv run ruff check src/ 2>&1 | tail -3
uv run pytest tests/ -v 2>&1 | tail -5
cd /Users/dks0662779/gemini-live-3d-bridge/frontend
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -5

echo "=== Init complete ==="
