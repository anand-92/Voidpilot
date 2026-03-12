import asyncio
import base64
import logging
import traceback

from fastapi import APIRouter, WebSocket

from src.app.core.config import settings
from src.app.services.gemini_audio import GeminiLive
from src.app.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3


@router.websocket("/live")
async def gemini_live_ws(websocket: WebSocket):
    """WebSocket endpoint for Gemini Live connection."""
    logger.info("New Gemini Live WebSocket connection request")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"

    manager = WebSocketManager(websocket, "Live")
    pending_tool_calls: dict[str, asyncio.Future] = {}

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        tools=[],
        tool_mapping={},
    )

    async def handle_client_message(payload: dict) -> bool:
        msg_type = payload.get("type")

        if msg_type == "image":
            content = payload.get("content", "")
            if not content:
                logger.warning("Image payload with no content")
                return True
            logger.info(f"Received image: {len(content)} base64 chars")
            try:
                await manager.video_input_queue.put(base64.b64decode(content))
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {e}")
            return True

        if msg_type == "text":
            content = payload.get("content", "")
            logger.info(f"Received text: {content}")
            await manager.text_input_queue.put(content)
            return True

        if msg_type == "tool_response":
            call_id = payload.get("call_id")
            result = payload.get("result", "")
            if not call_id:
                logger.warning("Tool response missing call_id")
                return True

            future = pending_tool_calls.pop(str(call_id), None)
            if future and not future.done():
                future.set_result(result)
                logger.info(f"Resolved tool call {call_id}: {result}")
            else:
                logger.warning(f"Tool response for unknown call_id: {call_id}")
            return True

        return False

    async def run_session() -> bool:
        try:
            logger.info("Starting Gemini session...")
            async for event in gemini_client.start_session(
                audio_input_queue=manager.audio_input_queue,
                video_input_queue=manager.video_input_queue,
                text_input_queue=manager.text_input_queue,
                audio_output_callback=manager.audio_output_callback,
                audio_interrupt_callback=manager.audio_interrupt_callback,
            ):
                if event:
                    logger.debug(f"Gemini event: {event['type']}")
                    await manager.forward_gemini_event(event)
            logger.info("Gemini session ended normally")
            return True
        except Exception as e:
            logger.error(f"Gemini session error: {e}")
            logger.error(traceback.format_exc())
            await manager.send_to_client({"type": "error", "content": str(e)})
            return True

    receive_task = asyncio.create_task(
        manager.receive_from_client(handle_client_message)
    )
    try:
        for attempt in range(MAX_RETRIES):
            should_retry = await run_session()
            if not should_retry or attempt >= MAX_RETRIES - 1:
                break
            logger.info(f"Session ended, retrying ({attempt + 1}/{MAX_RETRIES})...")
            await asyncio.sleep(1)
    finally:
        logger.info("Cleaning up WebSocket connection...")
        receive_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass


@router.websocket("/ping")
async def ping_pong(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"pong: {data}")
