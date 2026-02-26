import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.gemini_live import GeminiLiveService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def gemini_live_ws(websocket: WebSocket):
    logger.info("New WebSocket connection request received")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY
    if not api_key or api_key == "your-google-api-key-here":
        await websocket.send_json(
            {"type": "error", "message": "GOOGLE_API_KEY not configured"}
        )
        await websocket.close(code=1008)
        return

    service = GeminiLiveService(api_key=api_key)

    try:
        await service.connect_and_stream(websocket)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})


@router.websocket("/ping")
async def ping_pong(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"pong: {data}")
