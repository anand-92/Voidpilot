import asyncio
import json
import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.ephemeral_token import create_ephemeral_token
from src.app.services.gemini_audio import GeminiAudioBridge

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


@router.websocket("/live")
async def gemini_live_ws(websocket: WebSocket):
    """WebSocket endpoint for Gemini Live audio connection."""
    logger.info("New Gemini Live WebSocket connection request received")
    await websocket.accept()

    bridge = GeminiAudioBridge(websocket)

    # Start bridge in background and handle messages from client
    async def client_messages():
        try:
            while True:
                message = await websocket.receive()
                if "text" in message:
                    data = json.loads(message["text"])
                    if data.get("type") == "text":
                        await bridge.send_text(data.get("content", ""))
                elif "bytes" in message:
                    await bridge.send_audio(message["bytes"])
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"Client message error: {e}")

    try:
        # Run both the bridge and client message handler
        await asyncio.gather(
            bridge.run(),
            client_messages()
        )
    except Exception as e:
        logger.error(f"Gemini Live WebSocket error: {e}")
        await websocket.close(code=1011)


@router.websocket("/ping")
async def ping_pong(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"pong: {data}")
