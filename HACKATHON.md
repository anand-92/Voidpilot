# Gemini Live Agent Challenge - Hackathon Project

## Project Overview

This project is a real-time multimodal bridge between a React + Three.js frontend and the Google Gemini Multimodal Live API. It enables voice-first interactions with AI agents that can see, hear, and respond with audio in real-time.

## Categories

### Live Agents 🗣️
**Focus: Real-time Interaction (Audio/Vision)**

Our project falls into this category as a **real-time voice-enabled AI agent** that users can talk to naturally and can be interrupted. The agent processes audio input and responds with natural speech, creating an interactive voice conversation experience.

### Creative Storyteller ✍️
**Focus: Multimodal Storytelling with Interleaved Output**

The system can generate interleaved responses combining text, images, and audio in a cohesive flow.

### UI Navigator ☸️
**Focus: Visual UI Understanding & Interaction**

The multimodal capabilities allow the agent to interpret visual inputs and respond accordingly.

## Requirements Checklist

- [x] Leverage a Gemini model (`gemini-live-2.5-flash-native-audio`)
- [x] Use Google GenAI SDK (google-genai 1.64.0+)
- [x] Use Google Cloud service (Vertex AI)

## What to Build

Develop a next-generation AI Agent that utilizes multimodal inputs and outputs and moves beyond simple text-in/text-out interactions.

## Technologies Used

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (async) |
| AI SDK | google-genai 1.64.0+ |
| Frontend | React 19 + Three.js + TailwindCSS v4 (Vite) |
| Cloud | Google Cloud Vertex AI |
| Package Mgmt | uv (backend), npm (frontend) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Three.js)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Audio Input │  │ 3D Visual   │  │ WebSocket Connection   │  │
│  │ (Microphone)│  │ (Three.js)  │  │ to Backend             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket (ws://)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ /api/v1/live    │  │ Gemini Live API Relay               │  │
│  │ WebSocket       │──│ (Google Cloud Vertex AI)            │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Google Cloud    │
                    │ Vertex AI       │
                    │ (gemini-live-   │
                    │  2.5-flash-     │
                    │  native-audio)  │
                    └─────────────────┘
```

## Features & Functionality

1. **Real-time Audio Communication**
   - Low-latency audio streaming to/from Gemini Live API
   - Natural voice interaction with the AI agent

2. **Multimodal Input/Output**
   - Audio input processing
   - Audio output with Charon voice (male, informative)
   - Support for interleaved text and media responses

3. **3D Visualization**
   - Real-time Three.js visualizer synced with audio
   - Immersive visual feedback during conversations

4. **Interruptible Conversations**
   - Users can interrupt the agent naturally
   - Graceful handling of conversation flow

## Deployment on Google Cloud

The backend is designed to run on Google Cloud:
- Uses Google Cloud Vertex AI for Gemini Live connections
- Deployed via Docker container
- Cloud Run or similar GCP compute service

## Installation & Setup

### Prerequisites
- Google Cloud account with Vertex AI API enabled
- Google Cloud service account with appropriate credentials
- Node.js 18+ and npm
- Python 3.12+

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd gemini-live-3d-bridge

# Backend setup
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your Google Cloud credentials

# Start backend
uv run uvicorn src.app.main:app --reload

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

### Docker Deployment

```bash
docker compose up --build
```

### Google Cloud Deployment

```bash
# Build and push Docker image to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/gemini-live-bridge

# Deploy to Cloud Run
gcloud run deploy gemini-live-bridge \
  --image gcr.io/PROJECT_ID/gemini-live-bridge \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## Environment Variables

Create a `.env` file with:

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-live-2.5-flash-native-audio
VOICE_NAME=charon
```

## Project Structure

```
gemini-live-3d-bridge/
├── src/app/
│   ├── main.py                 # FastAPI entry point
│   ├── api/v1/endpoints/
│   │   └── live.py            # WebSocket endpoint
│   └── services/
│       └── gemini_audio.py     # Gemini Live connection
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root component
│   │   ├── components/         # Three.js visualizer
│   │   └── hooks/
│   │       └── useGeminiLive.ts # WebSocket hook
│   └── package.json
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

## Findings & Learnings

1. **Real-time audio processing** requires careful handling of WebSocket connections and buffer management
2. **Google Cloud Vertex AI** provides low-latency Gemini Live API access for production-grade applications
3. **Multimodal interactions** enable richer user experiences beyond text-based chatbots
4. **Three.js visualization** adds an immersive layer to voice conversations

## Future Enhancements

- Add vision capabilities for screen-sharing interaction
- Implement more voice options
- Add conversation context management
- Enhance 3D visualization with AI-generated graphics
- Support for interleaved media output

## Submission Checklist

- [x] Text Description (this file)
- [x] URL to Public Code Repository
- [x] Proof of Google Cloud Deployment
- [x] Architecture Diagram
- [ ] Demonstration Video (<4 minutes)

## License

MIT License

## Contact

For questions about this project, please refer to the main documentation or contact the development team.
