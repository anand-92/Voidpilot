import asyncio
import base64
import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.gemini_audio import GeminiLive

logger = logging.getLogger(__name__)

router = APIRouter()

# Model from example
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

def validate_api_key() -> str:
    """Validate that GOOGLE_API_KEY is configured."""
    api_key = settings.GOOGLE_API_KEY
    if not api_key or api_key == "your-google-api-key-here":
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    return api_key


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

    audio_input_queue = asyncio.Queue()
    video_input_queue = asyncio.Queue()
    text_input_queue = asyncio.Queue()

    # Clear any pending items in queues
    while not audio_input_queue.empty():
        try:
            audio_input_queue.get_nowait()
        except asyncio.QueueEmpty:
            break
    while not video_input_queue.empty():
        try:
            video_input_queue.get_nowait()
        except asyncio.QueueEmpty:
            break
    while not text_input_queue.empty():
        try:
            text_input_queue.get_nowait()
        except asyncio.QueueEmpty:
            break

    async def audio_output_callback(data):
        try:
            await websocket.send_json({
                "type": "audio",
                "content": data.hex()
            })
        except Exception as e:
            logger.error(f"Error sending audio to client: {e}")

    async def audio_interrupt_callback():
        try:
            await websocket.send_json({"type": "interrupted"})
        except Exception as e:
            logger.error(f"Error sending interrupted to client: {e}")

    gemini_client = GeminiLive(
        api_key=api_key, 
        model=MODEL, 
        input_sample_rate=16000
    )

    async def receive_from_client():
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
                            if payload.get("type") == "image":
                                logger.info(f"Received image chunk from client: {len(payload['data'])} base64 chars")
                                image_data = base64.b64decode(payload["data"])
                                await video_input_queue.put(image_data)
                                continue
                            elif payload.get("type") == "text":
                                logger.info(f"Received text from client: {payload.get('content', '')}")
                                await text_input_queue.put(payload.get("content", ""))
                                continue
                    except json.JSONDecodeError:
                        pass
                    
                    # Fallback for raw text if not JSON or doesn't match expected types
                    logger.info(f"Received raw text from client: {text}")
                    await text_input_queue.put(text)
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected from client side")
        except RuntimeError as e:
            # Handle "Cannot call 'receive' once a disconnect message has been received"
            if "disconnect" in str(e).lower():
                logger.info("WebSocket receive after disconnect (normal cleanup)")
            else:
                logger.error(f"RuntimeError in receive_from_client: {e}")
                import traceback
                logger.error(traceback.format_exc())
        except Exception as e:
            logger.error(f"Error receiving from client: {e}")
            import traceback
            logger.error(traceback.format_exc())

    receive_task = asyncio.create_task(receive_from_client())
    max_retries = 3
    retry_count = 0

    async def run_session():
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
                if event:
                    logger.debug(f"Event from Gemini: {event['type']}")
                    # Reset retry count on successful events
                    retry_count = 0
                    if event.get("type") in ["user", "gemini"]:
                        content = event.get("text", event.get("content", ""))
                        await websocket.send_json({
                            "type": "text",
                            "role": event["type"],
                            "content": content
                        })
                    elif event.get("type") == "text":
                        await websocket.send_json(event)
                    elif event.get("type") == "tool_call":
                        # Forward tool call events to frontend
                        await websocket.send_json({
                            "type": "tool_call",
                            "name": event.get("name"),
                            "args": event.get("args"),
                            "result": event.get("result")
                        })
                    else:
                        await websocket.send_json(event)
            logger.info("Gemini session ended normally")
        except Exception as e:
            logger.error(f"Error in Gemini session: {e}")
            import traceback
            logger.error(traceback.format_exc())
            try:
                await websocket.send_json({"type": "error", "content": str(e)})
            except:
                pass

    try:
        while retry_count < max_retries:
            await run_session()
            retry_count += 1
            if retry_count < max_retries:
                logger.info(f"Session ended, retrying ({retry_count}/{max_retries})...")
                # Wait before retrying
                await asyncio.sleep(1)
    finally:
        logger.info("Cleaning up WebSocket connection...")
        receive_task.cancel()
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/ping")
async def ping_pong(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"pong: {data}")
