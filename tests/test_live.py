import asyncio
import base64
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.main import app


@pytest.mark.asyncio
async def test_image_passthrough():
    test_result = {"success": False, "error": None}

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with patch("src.app.api.v1.endpoints.live.settings", mock_settings), \
         patch("src.app.api.v1.endpoints.live.GeminiLive") as MockGeminiLive:

        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            video_input_queue = kwargs.get("video_input_queue")
            try:
                data = await asyncio.wait_for(video_input_queue.get(), timeout=2.0)
                if data == b"test_image_data_bytes":
                    test_result["success"] = True
                else:
                    test_result["error"] = (
                        f"Expected b'test_image_data_bytes', got {data}"
                    )
            except TimeoutError:
                test_result["error"] = "Timeout waiting for video_input_queue.get()"
            except Exception as e:
                test_result["error"] = str(e)

            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect("/api/v1/live/live") as websocket:
            base64_data = base64.b64encode(b"test_image_data_bytes").decode("utf-8")
            payload = {
                "type": "image",
                "content": base64_data,
                "mime_type": "image/jpeg"
            }
            websocket.send_text(json.dumps(payload))
            import time
            time.sleep(2.5)

    assert test_result["success"] is True, test_result["error"]
