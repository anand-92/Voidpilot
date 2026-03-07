# Voidpilot

**AI that sees your screen, hears your voice, and takes the wheel.**

Voidpilot is an Electron-based desktop assistant that connects your screen and microphone directly to Gemini Live using the Gemini API.

It utilizes `@midscene/computer` to allow Gemini to execute UI actions directly on your operating system based on voice requests and screen awareness.

## Features
- **Real-time Audio Bridge**: Talk to Gemini directly.
- **Vision Stream**: Streams your screen to Gemini at 1fps using `desktopCapturer`.
- **OS Automation**: Uses `gemini-3.1-pro-preview` and Midscene to click, type, and navigate your UI.
- **Ghost Cursor**: Visually highlights where the AI is about to click or look.
- **Interruptible**: Automatically aborts automation if you move your mouse or speak.

## Setup

1. **Install Python dependencies:**
   ```bash
   uv sync
   ```

2. **Install Node dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_API_KEY=your_api_key_here
   ```

## Running the Application

1. **Start the Backend:**
   The backend acts as the proxy to the Gemini Live API.
   ```bash
   uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000
   ```

2. **Start the Frontend (Electron App):**
   ```bash
   cd frontend
   npm run dev
   ```

## Architecture
- **Backend:** FastAPI application utilizing `google-genai` SDK for the Live WebSocket connection. It manages tool calls and parses audio/image data.
- **Frontend:** React app built with Vite, wrapped in Electron. The UI provides a microphone and streaming toggle, and the Electron Main process handles all OS-level integration (capturing screen, automating mouse/keyboard with Midscene).
