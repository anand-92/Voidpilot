import asyncio
import logging
import traceback
from functools import partial

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketState

from src.app.core.config import settings
from src.app.services.file_search_service import search_project_context
from src.app.services.gemini_audio import GeminiLive, build_live_history_turns
from src.app.services.tool_defs import SEARCH_PROJECT_CONTEXT_TOOL_DEF
from src.app.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
DEFAULT_VOICE = "Despina"
ALLOWED_VOICES = frozenset({
    "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
    "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
    "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
    "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
    "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
})


def _apply_requested_voice(gemini_client: GeminiLive, payload: dict) -> bool:
    requested_voice = payload.get("voice_name")
    if requested_voice and requested_voice in ALLOWED_VOICES:
        gemini_client.voice_name = requested_voice
        logger.info("Walkthrough voice: %s", requested_voice)
        return True
    return False


async def _handle_client_message(
    payload: dict,
    manager: WebSocketManager,
    gemini_client: GeminiLive,
) -> bool:
    msg_type = payload.get("type")
    if msg_type == "session_config":
        _apply_requested_voice(gemini_client, payload)
        handle = payload.get("handle")
        if isinstance(handle, str) and handle:
            gemini_client.session_resumption_handle = handle
        gemini_client.history_turns = build_live_history_turns(
            payload.get("conversation_history")
        )
        return True
    if msg_type == "text":
        content = payload.get("content", "")
        logger.info("Walkthrough received text: %s", content)
        await manager.text_input_queue.put(content)
        return True
    return False

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

    api_key = settings.GOOGLE_API_KEY

    manager = WebSocketManager(websocket, "Walkthrough")

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        voice_name=DEFAULT_VOICE,
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

    async def run_session() -> bool:
        should_reconnect = False
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
                    if (
                        event.get("type") == "session_resumption_update"
                        and event.get("handle")
                    ):
                        gemini_client.session_resumption_handle = event["handle"]
                    if event.get("type") == "session_dead":
                        should_reconnect = True
                        continue
                    logger.debug("Walkthrough event: %s", event["type"])
                    await manager.forward_gemini_event(event)
            logger.info("Walkthrough session ended normally")
        except Exception as e:
            logger.error("Walkthrough session error: %s", e)
            logger.error(traceback.format_exc())
            await manager.send_to_client({"type": "error", "content": str(e)})
        return should_reconnect

    receive_task = asyncio.create_task(
        manager.receive_from_client(
            partial(
                _handle_client_message,
                manager=manager,
                gemini_client=gemini_client,
            )
        )
    )
    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            should_reconnect = await run_session()
            if not should_reconnect:
                break
            logger.info("Walkthrough live session reconnecting...")
            await asyncio.sleep(0.25)
    finally:
        logger.info("Cleaning up walkthrough WebSocket...")
        receive_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
