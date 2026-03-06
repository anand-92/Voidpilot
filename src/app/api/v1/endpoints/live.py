import asyncio
import base64
import json
import logging
import traceback
from contextlib import AsyncExitStack

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.gemini_audio import GeminiLive

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


@router.websocket("/live")
async def gemini_live_ws(websocket: WebSocket):
    """WebSocket endpoint for Gemini Live connection."""
    logger.info("New Gemini Live WebSocket connection request received")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY
    if not api_key:
        logger.error("GOOGLE_API_KEY not configured")
        await websocket.close(code=1011)
        return

    audio_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    video_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    text_input_queue: asyncio.Queue[str] = asyncio.Queue()

    async def audio_output_callback(data: bytes) -> None:
        try:
            await websocket.send_json({"type": "audio", "content": data.hex()})
        except Exception as e:
            logger.error(f"Error sending audio to client: {e}")

    async def audio_interrupt_callback() -> None:
        try:
            await websocket.send_json({"type": "interrupted"})
        except Exception as e:
            logger.error(f"Error sending interrupted to client: {e}")

    async with AsyncExitStack() as stack:
        mcp_tools = None
        mcp_tool_mapping = None

        gemini_client = GeminiLive(
            api_key=api_key,
            model=MODEL,
            input_sample_rate=16000,
            tools=mcp_tools,
            tool_mapping=mcp_tool_mapping,
        )

        async def receive_from_client() -> None:
            try:
                while True:
                    message = await websocket.receive()
                    if "bytes" in message:
                        await audio_input_queue.put(message["bytes"])
                    elif "text" in message:
                        text = message["text"]
                        try:
                            payload = json.loads(text)
                            if isinstance(payload, dict):
                                msg_type = payload.get("type")
                                if msg_type == "image":
                                    logger.info(
                                        f"Received image chunk: {len(payload['data'])} base64 chars"
                                    )
                                    await video_input_queue.put(
                                        base64.b64decode(payload["data"])
                                    )
                                    continue
                                if msg_type == "text":
                                    logger.info(
                                        f"Received text: {payload.get('content', '')}"
                                    )
                                    await text_input_queue.put(
                                        payload.get("content", "")
                                    )
                                    continue
                        except json.JSONDecodeError:
                            pass
                        logger.info(f"Received raw text from client: {text}")
                        await text_input_queue.put(text)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected from client side")
            except RuntimeError as e:
                if "disconnect" in str(e).lower():
                    logger.info("WebSocket receive after disconnect (normal cleanup)")
                else:
                    logger.error(f"RuntimeError in receive_from_client: {e}")
                    logger.error(traceback.format_exc())
            except Exception as e:
                logger.error(f"Error receiving from client: {e}")
                logger.error(traceback.format_exc())

        receive_task = asyncio.create_task(receive_from_client())
        max_retries = 3
        retry_count = 0

        async def run_session() -> None:
            nonlocal retry_count
            try:
                logger.info("Starting Gemini session...")
                async for event in gemini_client.start_session(
                    audio_input_queue=audio_input_queue,
                    video_input_queue=video_input_queue,
                    text_input_queue=text_input_queue,
                    audio_output_callback=audio_output_callback,
                    audio_interrupt_callback=audio_interrupt_callback,
                ):
                    if not event:
                        continue
                    logger.debug(f"Event from Gemini: {event['type']}")
                    retry_count = 0
                    event_type = event.get("type")
                    if event_type in ("user", "gemini"):
                        await websocket.send_json({
                            "type": "text",
                            "role": event_type,
                            "content": event.get("text", event.get("content", "")),
                        })
                    elif event_type == "tool_call":
                        await websocket.send_json({
                            "type": "tool_call",
                            "name": event.get("name"),
                            "args": event.get("args"),
                            "result": event.get("result"),
                        })
                    else:
                        await websocket.send_json(event)
                logger.info("Gemini session ended normally")
            except Exception as e:
                logger.error(f"Error in Gemini session: {e}")
                logger.error(traceback.format_exc())
                try:
                    await websocket.send_json({"type": "error", "content": str(e)})
                except Exception:
                    pass

        try:
            while retry_count < max_retries:
                await run_session()
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(
                        f"Session ended, retrying ({retry_count}/{max_retries})..."
                    )
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
