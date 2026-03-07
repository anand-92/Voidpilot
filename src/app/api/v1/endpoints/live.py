import asyncio
import base64
import json
import logging
import traceback
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.gemini_audio import GeminiLive

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3
TOOL_CALL_TIMEOUT = 60.0

MIDSCENE_TOOL_DEF = {
    "function_declarations": [
        {
            "name": "execute_midscene_action",
            "description": (
                "Execute a UI action on the user's desktop using"
                " Midscene.js. Use this to click buttons, type"
                " text, or navigate the UI."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "description": (
                            "The Midscene action prompt to execute"
                            " (e.g., 'Click the Login button',"
                            ' \'Type "hello" into the search'
                            " bar')."
                        ),
                    }
                },
                "required": ["action"],
            },
        }
    ]
}


@router.websocket("/live")
async def gemini_live_ws(websocket: WebSocket):  # noqa: C901
    """WebSocket endpoint for Gemini Live connection."""
    logger.info("New Gemini Live WebSocket connection request")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"

    audio_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    video_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    text_input_queue: asyncio.Queue[str] = asyncio.Queue()
    pending_tool_calls: dict[str, asyncio.Future] = {}

    async def send_to_client(payload: dict) -> None:
        try:
            await websocket.send_json(payload)
        except Exception as e:
            logger.error(f"Error sending to client: {e}")

    async def execute_midscene_action(action: str) -> str:
        call_id = str(uuid.uuid4())
        future = asyncio.get_running_loop().create_future()
        pending_tool_calls[call_id] = future

        try:
            logger.info(f"Sending tool call {call_id} to client: {action}")
            await websocket.send_json(
                {
                    "type": "tool_call",
                    "name": "execute_midscene_action",
                    "call_id": call_id,
                    "args": {"action": action},
                }
            )

            result = await asyncio.wait_for(future, timeout=TOOL_CALL_TIMEOUT)
            logger.info(f"Tool result for {call_id}: {result}")
            return str(result)
        except TimeoutError:
            logger.error(f"Tool call {call_id} timed out after {TOOL_CALL_TIMEOUT}s")
            return "Error: Action execution timed out"
        except Exception as e:
            logger.error(f"Tool call {call_id} failed: {e}")
            return f"Error: {e}"
        finally:
            pending_tool_calls.pop(call_id, None)

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        tools=[MIDSCENE_TOOL_DEF],
        tool_mapping={"execute_midscene_action": execute_midscene_action},
    )

    async def handle_client_message(payload: dict) -> bool:
        """Handle a parsed JSON message. Returns True if handled."""
        msg_type = payload.get("type")

        if msg_type == "image":
            content = payload.get("content", "")
            if not content:
                logger.warning("Image payload with no content")
                return True
            logger.info(f"Received image: {len(content)} base64 chars")
            try:
                await video_input_queue.put(base64.b64decode(content))
            except Exception as e:
                logger.error(f"Failed to decode base64 image: {e}")
            return True

        if msg_type == "text":
            content = payload.get("content", "")
            logger.info(f"Received text: {content}")
            await text_input_queue.put(content)
            return True

        if msg_type == "tool_response":
            call_id = payload.get("call_id")
            result = payload.get("result", "")
            future = pending_tool_calls.pop(call_id, None)
            if future and not future.done():
                future.set_result(result)
                logger.info(f"Resolved tool call {call_id}: {result}")
            else:
                logger.warning(f"Tool response for unknown call_id: {call_id}")
            return True

        return False

    async def receive_from_client() -> None:  # noqa: C901
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

                logger.info(f"Received raw text: {text}")
                await text_input_queue.put(text)
        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except RuntimeError as e:
            if "disconnect" in str(e).lower():
                logger.info("Receive after disconnect (normal)")
            else:
                logger.error(f"RuntimeError in receiver: {e}")
                logger.error(traceback.format_exc())
        except Exception as e:
            logger.error(f"Error receiving from client: {e}")
            logger.error(traceback.format_exc())

    async def forward_gemini_event(event: dict) -> None:
        event_type = event.get("type")
        if event_type in ("user", "gemini"):
            await send_to_client(
                {
                    "type": "text",
                    "role": event_type,
                    "content": event.get("text", event.get("content", "")),
                }
            )
        elif event_type == "tool_call":
            await send_to_client(
                {
                    "type": "tool_call",
                    "name": event.get("name"),
                    "args": event.get("args"),
                    "result": event.get("result"),
                }
            )
        else:
            await send_to_client(event)

    async def audio_output_callback(data: bytes) -> None:
        await send_to_client({"type": "audio", "content": data.hex()})

    async def audio_interrupt_callback() -> None:
        await send_to_client({"type": "interrupted"})

    async def run_session() -> bool:
        """Run one Gemini session. Returns True if retry allowed."""
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
                    logger.debug(f"Gemini event: {event['type']}")
                    await forward_gemini_event(event)
            logger.info("Gemini session ended normally")
            return True
        except Exception as e:
            logger.error(f"Gemini session error: {e}")
            logger.error(traceback.format_exc())
            await send_to_client({"type": "error", "content": str(e)})
            return True

    receive_task = asyncio.create_task(receive_from_client())
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
