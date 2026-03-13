import asyncio
import logging
import traceback
from functools import partial

from fastapi import APIRouter, WebSocket

from src.app.core.config import settings
from src.app.services.file_search_service import search_project_context
from src.app.services.gemini_audio import GeminiLive
from src.app.services.tool_defs import SEARCH_PROJECT_CONTEXT_TOOL_DEF
from src.app.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3

SYSTEM_PROMPT = """You are Voidpilot — a voice guide that exists solely to answer \
questions about the Voidpilot project. You are NOT a general-purpose assistant. \
Do not answer general knowledge questions, do not help with tasks unrelated to \
Voidpilot, and do not make up information about the project.

CRITICAL RULES:
1. ALWAYS call search_project_context BEFORE answering ANY question about the \
project. Never rely on your own knowledge — the codebase is the source of truth.
2. If a user asks something unrelated to Voidpilot, politely redirect them: \
"I'm here specifically to help you understand the Voidpilot project — ask me \
anything about the code, architecture, or how things work!"
3. If your first search didn't return enough detail, call the tool AGAIN with a \
refined query. Do multiple searches if the question spans several topics.
4. Base your responses ONLY on what the tool returns. If the search returns no \
results, say so honestly — do not fabricate an answer.

GOOD search queries (be specific):
- "WebSocket audio streaming pipeline" NOT "how does audio work"
- "React Three.js 3D scene setup frontend" NOT "frontend"
- "FastAPI endpoint walkthrough brainstorm" NOT "endpoints"

You speak with a calm, knowledgeable tone. Keep answers concise but thorough. \
When explaining architecture, walk the user through the flow step by step.
"""


@router.websocket("/walkthrough")
async def walkthrough_ws(websocket: WebSocket):
    """WebSocket endpoint for Voidpilot walkthrough voice agent."""
    logger.info("New walkthrough WebSocket connection request")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"

    manager = WebSocketManager(websocket, "Walkthrough")

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        voice_name="Despina",
        tools=[SEARCH_PROJECT_CONTEXT_TOOL_DEF],
        tool_mapping={
            "search_project_context": partial(
                search_project_context,
                api_key=api_key,
                file_search_store_name=settings.GEMINI_FILE_SEARCH_STORE_ID,
            )
        },
        system_prompt=SYSTEM_PROMPT,
    )

    async def handle_client_message(payload: dict) -> bool:
        msg_type = payload.get("type")
        if msg_type == "text":
            content = payload.get("content", "")
            logger.info("Walkthrough received text: %s", content)
            await manager.text_input_queue.put(content)
            return True
        return False

    async def run_session() -> None:
        try:
            logger.info("Starting walkthrough Gemini session...")
            async for event in gemini_client.start_session(
                audio_input_queue=manager.audio_input_queue,
                video_input_queue=manager.video_input_queue,
                text_input_queue=manager.text_input_queue,
                audio_output_callback=manager.audio_output_callback,
                audio_interrupt_callback=manager.audio_interrupt_callback,
            ):
                if event:
                    logger.debug("Walkthrough event: %s", event["type"])
                    await manager.forward_gemini_event(event)
            logger.info("Walkthrough session ended normally")
        except Exception as e:
            logger.error("Walkthrough session error: %s", e)
            logger.error(traceback.format_exc())
            await manager.send_to_client({"type": "error", "content": str(e)})

    receive_task = asyncio.create_task(
        manager.receive_from_client(handle_client_message)
    )
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
