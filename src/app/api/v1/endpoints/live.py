import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.ephemeral_token import create_ephemeral_token
from src.app.services.gemini_live import GeminiLiveService

logger = logging.getLogger(__name__)

router = APIRouter()


def validate_api_key() -> str:
    """Validate that GOOGLE_API_KEY is configured."""
    api_key = settings.GOOGLE_API_KEY
    if not api_key or api_key == "your-google-api-key-here":
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
    return api_key


@router.post("/token")
async def create_token() -> dict:
    """
    Generate an ephemeral token for direct Gemini Live API connection.

    Returns:
        A dict containing the token name.
    """
    try:
        api_key = validate_api_key()
        token_name = create_ephemeral_token(api_key)
        return {"token": token_name}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create ephemeral token: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create token: {str(e)}")


@router.websocket("/ws")
async def gemini_live_ws(websocket: WebSocket):
    logger.info("New WebSocket connection request received")
    await websocket.accept()

    try:
        api_key = validate_api_key()
    except HTTPException as e:
        await websocket.send_json(
            {"type": "error", "message": e.detail}
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
