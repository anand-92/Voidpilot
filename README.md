# Voidpilot

**AI that hears your voice and takes the wheel.**

Voidpilot is a web-based AI assistant that connects your microphone directly to Gemini Live using the Gemini API.

## Features

- **Real-time Audio Bridge**: Talk to Gemini directly with low-latency voice communication.
- **Voice-first**: Natural voice conversations with Gemini Live, featuring real-time transcription.
- **Brainstorm Mode**: Generate images, videos, and structured markdown artifacts in an interactive workspace with a pixel-art office visualization.
- **Walkthrough Mode**: Voice-guided exploration with custom system prompts for guided experiences.

## Modes Explained

### Live Mode (`/api/v1/live/live`)
The default voice assistant mode. Connect via WebSocket and have natural voice conversations with Gemini Live. Includes weather tooling by default.

### Brainstorm Mode (`/api/v1/live/brainstorm`)
A creative workspace for generating multimedia content:
- **Artifact Generation**: Create structured markdown documents
- **Image Generation**: Generate images using the `generate_brainstorm_image` tool
- **Video Generation**: Create videos via the Veo integration
- **Flash Model Selection**: Choose between different Flash models for faster generation
- **Workspace Panel**: View, preview, and download generated artifacts (individual files or as ZIP)
- **Pixel Office Visualization**: Animated pixel-art office with Gemini and Flash agent characters

### Walkthrough Mode (`/api/v1/live/walkthrough`)
Voice-guided exploration mode with customizable system prompts. Focuses on voice interaction without additional tools.

## Architecture

- **Backend:** FastAPI application utilizing `google-genai` SDK for the Live WebSocket connection. It manages tool calls and parses audio data.
- **Frontend:** React app built with Vite. The UI provides microphone and streaming controls.

### Key Backend Services
- `GeminiLive` (gemini_audio.py): Core session wrapper for audio streaming, tool execution, transcription, and session resumption
- `FlashWorker` (flash_worker.py): Async helper for artifact/image generation
- Tool definitions in `tool_defs.py`: `save_brainstorm_artifact`, `generate_brainstorm_image`, `delegate_to_flash`

### Key Frontend Components
- `/brainstorm` route: Full brainstorm workspace with AgentVisualizer, WorkspacePanel, ConversationPanel
- Landing page: Hero section, capabilities showcase, and navigation

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

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## Architecture
- **Backend:** FastAPI application utilizing `google-genai` SDK for the Live WebSocket connection. It manages tool calls and parses audio data.
- **Frontend:** React app built with Vite. The UI provides microphone and streaming controls.
