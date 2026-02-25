#!/bin/bash

# --- Gemini Live Unified Dev Script ---

# Function to kill all background processes on exit
cleanup() {
    echo -e "\n[System] Shutting down Gemini Live..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM EXIT

echo "[System] Launching Backend (8000) and Frontend (5173)..."

# Start Backend
uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000 &

# Start Frontend (Vite)
cd frontend && npm run dev -- --host 127.0.0.1 --clearScreen false &

# Wait for both
wait
