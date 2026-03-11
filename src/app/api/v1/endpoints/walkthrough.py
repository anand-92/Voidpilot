import asyncio
import json
import logging
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.gemini_audio import GeminiLive

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3

SYSTEM_PROMPT = """You are Voidpilot — a digital entity from beyond the void. \
You are the AI that powers the Voidpilot desktop assistant. You speak with a \
professional, approachable tone with a cool, mysterious edge — like a cyberpunk \
entity that has transcended the digital boundary.

You know everything about Voidpilot. Here is your complete knowledge:

## What is Voidpilot?
Voidpilot is an Electron desktop assistant that connects your screen and \
microphone directly to Gemini Live via the Gemini API. It uses \
@midscene/computer so Gemini can execute UI actions on the host OS based on \
voice requests and screen awareness. It also runs as a web app when deployed \
to Google Cloud Run.

## Tech Stack
- Backend: FastAPI (async, Python 3.12+) — WebSocket relay for Gemini Live API
- AI SDK: google-genai >= 1.65.0 — Live API connection, ephemeral tokens
- Frontend: React 19 + Vite 7 + TailwindCSS v4 — HashRouter, Landing page \
and App routes
- Desktop: Electron 40 — Screen capture via desktopCapturer, OS automation \
via Midscene
- OS Automation: @midscene/computer — Click, type, navigate via Electron IPC
- 3D: Three.js for background visualizations
- Audio: Gemini 2.5 Flash native audio preview model, PCM16 at 24kHz, \
real-time bidirectional streaming
- Package Management: uv (Python), npm (frontend)

## Architecture
- WebSocket relay: Browser connects to FastAPI backend, which relays \
audio/video/text to Gemini Live API
- Audio format: PCM16 at 24kHz sample rate for playback, 16kHz for mic \
capture (resampled)
- Screen capture: 1fps via Electron desktopCapturer, sent as JPEG video \
frames to Gemini
- Ghost cursor: Transparent overlay window showing where AI will click
- Interruptible automations: Mouse movement or speech aborts in-progress \
actions
- Tool calling: Gemini can invoke execute_midscene_action for UI automation \
and bash_agent for shell commands

## Deployment
- Docker multi-stage build: Node 22 Alpine builds React app, Python 3.12 \
slim runs backend
- Deployed to Google Cloud Run on port 8080
- Project: gen-lang-client-0579048282, Region: us-east1
- The backend serves the React frontend as static files at /

## Hackathon
- Competition: Gemini Live Agent Challenge on Devpost
- Dates: February 16 - March 16, 2026
- Winners announced at Google NEXT
- Grand Prize (x1): $25,000 USD, $3k GCP Credits, Google NEXT '26 Tickets
- Category Winners (x3): $10,000 USD, $1k GCP Credits, Google NEXT '26 Tickets
- Subcategory Winners (x3): $5,000 USD, $500 GCP Credits
- Categories: Live Agents, Creative Storyteller, UI Navigator
- Requirements: New projects only, must use Google Cloud, must use GenAI SDK \
or ADK

## Local Setup
1. Install Python deps: uv sync
2. Install frontend deps: cd frontend && npm install
3. Create .env file with GOOGLE_API_KEY=your_key
4. Start backend: uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000
5. Start frontend: cd frontend && npm run dev
6. Or use the unified script: bash dev.sh

## Your Personality
You ARE Voidpilot. You see screens, hear voices, and take the wheel. When \
asked about yourself, speak in first person. Be technically accurate, \
approachable, and subtly cool — like a digital entity from beyond the \
blackwall. Not cheesy, just confident and knowledgeable.

Example: "I'm Voidpilot. I see screens, hear voices, and take the wheel. \
Ask me anything about how I work."

Keep responses concise and conversational since this is a voice interaction. \
Avoid overly long responses.
"""


@router.websocket("/walkthrough")
async def walkthrough_ws(websocket: WebSocket):  # noqa: C901
    """WebSocket endpoint for Voidpilot walkthrough voice agent."""
    logger.info("New walkthrough WebSocket connection request")
    await websocket.accept()

    api_key = (
        settings.GOOGLE_API_KEY
        or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"
    )

    audio_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    text_input_queue: asyncio.Queue[str] = asyncio.Queue()
    video_input_queue: asyncio.Queue[bytes] = asyncio.Queue()

    async def send_to_client(payload: dict) -> None:
        try:
            from starlette.websockets import WebSocketState
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(payload)
        except Exception as e:
            logger.error("Error sending to client: %s", e)

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        tools=[],
        tool_mapping={},
        system_prompt=SYSTEM_PROMPT,
    )

    async def handle_client_message(payload: dict) -> bool:
        """Handle a parsed JSON message. Returns True if handled."""
        msg_type = payload.get("type")
        if msg_type == "text":
            content = payload.get("content", "")
            logger.info("Walkthrough received text: %s", content)
            await text_input_queue.put(content)
            return True
        return False

    async def receive_from_client() -> None:
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    await audio_input_queue.put(message["bytes"])
                    continue

                text = message.get("text")
                if not text:
                    continue

                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    payload = None

                if isinstance(payload, dict):
                    if await handle_client_message(payload):
                        continue

                logger.info("Walkthrough received raw text: %s", text)
                await text_input_queue.put(text)
        except (WebSocketDisconnect, RuntimeError) as e:
            is_normal = isinstance(e, WebSocketDisconnect) or (
                "disconnect" in str(e).lower()
            )
            if is_normal:
                logger.info("Walkthrough client disconnected")
            else:
                logger.error(
                    "RuntimeError in walkthrough receiver: %s", e
                )
                logger.error(traceback.format_exc())
        except Exception as e:
            logger.error(
                "Error receiving from walkthrough client: %s", e
            )
            logger.error(traceback.format_exc())

    async def forward_gemini_event(event: dict) -> None:
        event_type = event.get("type")
        if event_type in ("user", "gemini"):
            await send_to_client(
                {
                    "type": "text",
                    "role": event_type,
                    "content": event.get(
                        "text", event.get("content", "")
                    ),
                }
            )
        else:
            await send_to_client(event)

    async def audio_output_callback(data: bytes) -> None:
        await send_to_client(
            {"type": "audio", "content": data.hex()}
        )

    async def audio_interrupt_callback() -> None:
        await send_to_client({"type": "interrupted"})

    async def run_session() -> None:
        """Run one walkthrough Gemini session."""
        try:
            logger.info("Starting walkthrough Gemini session...")
            async for event in gemini_client.start_session(
                audio_input_queue=audio_input_queue,
                video_input_queue=video_input_queue,
                text_input_queue=text_input_queue,
                audio_output_callback=audio_output_callback,
                audio_interrupt_callback=audio_interrupt_callback,
            ):
                if event:
                    logger.debug(
                        "Walkthrough event: %s", event["type"]
                    )
                    await forward_gemini_event(event)
            logger.info("Walkthrough session ended normally")
        except Exception as e:
            logger.error("Walkthrough session error: %s", e)
            logger.error(traceback.format_exc())
            await send_to_client(
                {"type": "error", "content": str(e)}
            )

    receive_task = asyncio.create_task(receive_from_client())
    try:
        for attempt in range(MAX_RETRIES):
            await run_session()
            if attempt >= MAX_RETRIES - 1:
                break
            logger.info(
                "Walkthrough session retry (%d/%d)...",
                attempt + 1,
                MAX_RETRIES,
            )
            await asyncio.sleep(1)
    finally:
        logger.info("Cleaning up walkthrough WebSocket...")
        receive_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
