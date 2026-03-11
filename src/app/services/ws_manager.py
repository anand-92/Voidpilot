import asyncio
import json
import logging
import traceback
from collections.abc import Callable

from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Helper to manage WebSocket connections and queues for Gemini sessions."""

    def __init__(self, websocket: WebSocket, name: str = "Client"):
        self.websocket = websocket
        self.name = name
        self.audio_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self.video_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self.text_input_queue: asyncio.Queue[str] = asyncio.Queue()

    async def send_to_client(self, payload: dict) -> None:
        """Safely send a JSON payload to the client."""
        try:
            if self.websocket.client_state == WebSocketState.CONNECTED:
                await self.websocket.send_json(payload)
        except Exception as e:
            logger.error(f"Error sending to client in {self.name}: {e}")

    async def audio_output_callback(self, data: bytes) -> None:
        await self.send_to_client({"type": "audio", "content": data.hex()})

    async def audio_interrupt_callback(self) -> None:
        await self.send_to_client({"type": "interrupted"})

    async def receive_from_client(
        self, handle_client_message_fn: Callable | None = None
    ) -> None:
        """Continuous loop to receive from client and route to queues."""
        try:
            while True:
                message = await self.websocket.receive()
                if "bytes" in message:
                    await self.audio_input_queue.put(message["bytes"])
                    continue

                text = message.get("text")
                if not text:
                    continue

                payload = None
                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    pass

                if isinstance(payload, dict):
                    if handle_client_message_fn and await handle_client_message_fn(
                        payload
                    ):
                        continue

                logger.info(f"{self.name} received raw text: {text}")
                await self.text_input_queue.put(text)
        except (WebSocketDisconnect, RuntimeError) as e:
            is_normal = isinstance(e, WebSocketDisconnect) or (
                "disconnect" in str(e).lower()
            )
            if is_normal:
                logger.info(f"{self.name} client disconnected")
            else:
                logger.error(f"RuntimeError in {self.name} receiver: {e}")
                logger.error(traceback.format_exc())
        except Exception as e:
            logger.error(f"Error receiving from {self.name} client: {e}")
            logger.error(traceback.format_exc())

    async def forward_gemini_event(self, event: dict) -> None:
        """Common logic to forward Gemini events to the WebSocket client."""
        event_type = event.get("type")
        if event_type in ("user", "gemini"):
            await self.send_to_client(
                {
                    "type": "text",
                    "role": event_type,
                    "content": event.get("text", event.get("content", "")),
                }
            )
        elif event_type == "tool_call":
            await self.send_to_client(
                {
                    "type": "tool_call",
                    "name": event.get("name"),
                    "args": event.get("args"),
                    "result": event.get("result"),
                }
            )
        elif event_type == "session_resumption_update":
            await self.send_to_client(event)
        else:
            await self.send_to_client(event)
