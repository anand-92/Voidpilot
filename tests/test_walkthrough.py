import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.main import app


@pytest.mark.asyncio
async def test_walkthrough_accepts_connection():
    """Test that the walkthrough WebSocket endpoint accepts connections."""
    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with (
        patch(
            "src.app.api.v1.endpoints.walkthrough.settings",
            mock_settings,
        ),
        patch(
            "src.app.api.v1.endpoints.walkthrough.GeminiLive",
        ) as MockGeminiLive,
    ):
        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            text_input_queue = kwargs.get("text_input_queue")
            try:
                data = await asyncio.wait_for(
                    text_input_queue.get(), timeout=2.0
                )
                assert data == "hello voidpilot"
            except TimeoutError:
                pass
            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect(
            "/api/v1/live/walkthrough"
        ) as websocket:
            websocket.send_text(
                json.dumps(
                    {
                        "type": "text",
                        "content": "hello voidpilot",
                    }
                )
            )
            time.sleep(2.5)
