<div align="center">

# VOIDPILOT

### AI that hears your voice and takes the wheel.

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-hackathon.remembr--ai.com-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://hackathon.remembr-ai.com)
[![Demo Video](https://img.shields.io/badge/DEMO_VIDEO-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](#demo-video)

<br/>

[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Gemini-Live%20API-8E75B2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-WebSocket-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_19-Vite_7-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Hackathon_Submission-green?style=flat-square)](#)

<br/>

**Voidpilot is a next-generation multimodal AI agent that breaks the text-box paradigm.**
**Talk naturally. Generate visuals in real-time. Brainstorm with AI that sees, hears, and creates.**

Built for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/) | **Live Agents** + **Creative Storyteller** Categories

</div>

---

## The Problem

Current AI assistants are trapped in text boxes. You type, you wait, you read. But real creative collaboration is **fluid** — it's voice-first, visual, and happens in real-time. Nobody brainstorms by typing paragraphs back and forth.

## The Solution

Voidpilot connects your microphone directly to Gemini Live over WebSocket, creating an **immersive voice-first AI experience** where you can:

- **Talk naturally** with barge-in support — interrupt the AI mid-sentence, just like a real conversation
- **Generate images and videos** on the fly while talking — say "show me what that looks like" and watch it appear
- **Build structured artifacts** — documents, plans, creative briefs — all through voice
- **Share your sessions** with a single link — anyone can view the full conversation and download generated assets

---

## Modes

### Voice Assistant (Live Mode)
> *Real-time voice conversation with Gemini Live*

The core experience. Low-latency bidirectional audio streaming over WebSocket with real-time transcription. Supports natural turn-taking and barge-in interruption.

### Open Studio (Brainstorm Mode)
> *Full-featured creative workspace with multi-agent orchestration*

A voice-driven brainstorm environment with a pixel-art office visualization. Gemini coordinates with Flash models to generate **markdown artifacts**, **images**, and **videos** — all while you talk. Session persistence via Firebase lets you pick up right where you left off.

**Key capabilities:**
- `save_brainstorm_artifact` — structured markdown documents
- `generate_brainstorm_image` — real-time image generation
- `delegate_to_flash` — multi-agent delegation to Flash models
- Session library with auto-generated titles
- Download individual assets or everything as a ZIP

### Creative Spark (Brainstorm Mode)
> *Guided visual inspiration with auto-start conversations*

A streamlined mode focused purely on visual generation. The AI starts the conversation with a creative prompt, and a full-screen **masonry gallery** fills with generated images and videos as you talk. No buttons, no toggles — just you and the AI creating together.

### Walkthrough Mode
> *Voice-guided exploration with custom system prompts*

Embeddable voice overlay for guided experiences. Pass a custom system prompt via query parameters and get a voice-first walkthrough of any topic.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                  │
│  React 19 + Vite 7 + Tailwind v4 + shadcn/ui + Framer Motion   │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Microphone   │  │ useGeminiLive   │  │ useGeminiBrainstorm │  │
│  │ 16kHz PCM    │──│ WebSocket Hook  │  │ Artifact + Session  │  │
│  └─────────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│                             │ WebSocket             │ WebSocket   │
└─────────────────────────────┼───────────────────────┼────────────┘
                              │                       │
┌─────────────────────────────┼───────────────────────┼────────────┐
│                     BACKEND (FastAPI on Cloud Run)                │
│                                                                  │
│  ┌──────────────────────────┴───────────────────────┴─────────┐  │
│  │                    WebSocket Endpoints                      │  │
│  │  /api/v1/live/live  │  /brainstorm  │  /walkthrough        │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────┴────────────────────────────────┐  │
│  │              GeminiLive Session Wrapper                     │  │
│  │  Audio streaming • Tool execution • Transcription          │  │
│  │  Context compression • Session resumption                  │  │
│  └───────────┬──────────────┬────────────────┬────────────────┘  │
│              │              │                │                    │
│  ┌───────────▼──┐ ┌────────▼────────┐ ┌─────▼──────────────┐    │
│  │ Gemini Live  │ │  Flash Worker   │ │  Firebase Admin     │    │
│  │ API (GenAI)  │ │  (Delegation)   │ │  Auth + Firestore   │    │
│  │              │ │                 │ │  + Cloud Storage    │    │
│  └──────────────┘ └─────────────────┘ └─────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                     Google Cloud Run
                     (us-east1, Port 8080)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI / LLM** | Gemini 2.0 Flash (Live API), Google GenAI SDK, multi-model delegation |
| **Backend** | FastAPI, Python 3.12+, WebSocket streaming, `pydantic-settings` |
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind v4, shadcn/ui, Framer Motion |
| **Auth & Data** | Firebase Auth (Email + Google), Firestore, Cloud Storage |
| **Deployment** | Google Cloud Run, multi-stage Docker build |
| **Audio** | 16kHz PCM capture, 24kHz playback, real-time transcription |
| **Package Mgmt** | `uv` (Python), `npm` (Frontend) |

---

## Google Cloud Services Used

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Hosts the containerized FastAPI backend + static frontend |
| **Gemini Live API** | Real-time bidirectional audio/text streaming via `google-genai` SDK |
| **Firebase Auth** | User authentication (Email/Password + Google Sign-In) |
| **Firestore** | Session metadata, transcript persistence, artifact records |
| **Cloud Storage** | Generated image/video/markdown artifact storage |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 22+
- [uv](https://docs.astral.sh/uv/) package manager
- A [Google API Key](https://aistudio.google.com/apikey) with Gemini access

### 1. Clone & Install

```bash
git clone https://github.com/AshishT558/gemini-live-3d-bridge.git
cd gemini-live-3d-bridge

# Python dependencies
uv sync

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cat > .env << 'EOF'
GOOGLE_API_KEY=your_google_api_key

# Optional: Required for brainstorm session persistence
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EOF
```

> Guest mode works without Firebase. Firebase is only needed for persistent sessions, auth, and artifact storage.

### 3. Run

```bash
# Option A: Combined dev server
bash scripts/dev.sh

# Option B: Separate terminals
uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000   # Backend
cd frontend && npm run dev                                        # Frontend
```

Open **http://localhost:5173** and start talking.

---

## Deployment (Google Cloud Run)

The app ships as a single multi-stage Docker image: frontend is built as static assets and served by FastAPI.

```bash
gcloud run deploy voidpilot \
  --source . \
  --region us-east1 \
  --port 8080 \
  --allow-unauthenticated
```

**Live at:** [hackathon.remembr-ai.com](https://hackathon.remembr-ai.com)

---

## Project Structure

```
voidpilot/
├── src/app/
│   ├── main.py                      # FastAPI app, CORS, static serving
│   ├── api/v1/
│   │   ├── router.py                # API router
│   │   └── endpoints/
│   │       ├── live.py              # Voice assistant WebSocket
│   │       ├── brainstorm.py        # Brainstorm mode WebSocket
│   │       └── walkthrough.py       # Walkthrough mode WebSocket
│   ├── services/
│   │   ├── gemini_audio.py          # GeminiLive session wrapper
│   │   └── flash_worker.py          # Flash model delegation
│   └── core/
│       └── config.py                # pydantic-settings config
├── frontend/
│   ├── src/
│   │   ├── pages/                   # LandingPage, BrainstormPage, SharePage
│   │   ├── components/brainstorm/   # Mode selection, layouts, controls
│   │   └── hooks/                   # useGeminiLive, useGeminiBrainstorm
│   └── package.json
├── tests/                           # pytest test suite
├── Dockerfile                       # Multi-stage Cloud Run build
├── pyproject.toml                   # Python project config (uv)
└── scripts/dev.sh                   # Combined dev server launcher
```

---

## Testing & Linting

```bash
# Backend
uv run pytest tests/ -v          # Unit tests
uv run mypy src/                 # Type checking
uv run ruff check src/           # Linting

# Frontend
cd frontend
npm run lint                     # ESLint
npm run build                    # TypeScript + Vite build
```

---

## Key Features for Judges

| Criterion | How Voidpilot Delivers |
|-----------|----------------------|
| **Beyond Text** | Voice-first interaction with barge-in, real-time image/video generation during conversation |
| **Live & Context-Aware** | Bidirectional WebSocket audio streaming, session resumption, context compression |
| **Multi-Agent** | Gemini Live orchestrates Flash models for parallel artifact generation |
| **Cloud Native** | Full Google Cloud stack — Cloud Run, Gemini Live API, Firebase Auth/Firestore/Storage |
| **Robust** | Graceful error handling, auto-reconnection, session persistence across disconnects |
| **Shareable** | Public share links for brainstorm sessions with mode-appropriate layouts |

---

<div align="center">

**Built with Gemini Live API on Google Cloud**

[![Google Cloud](https://img.shields.io/badge/Powered_by-Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com)
[![Gemini](https://img.shields.io/badge/Built_with-Gemini_Live-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

Made for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com/) | #GeminiLiveAgentChallenge

</div>
