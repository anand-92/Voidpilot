import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app.main import app


@pytest.mark.asyncio
async def test_midscene_tool_call_routing():
    """
    Test that the backend correctly instantiates GeminiLive with the
    execute_midscene_action tool, and can route a tool call to the
    client, wait for the response, and return it.
    """
    test_result = {"success": False, "error": None, "tool_executed": False}

    mock_settings = MagicMock()
    mock_settings.GOOGLE_API_KEY = "test_key"

    with patch("src.app.api.v1.endpoints.live.settings", mock_settings), \
         patch("src.app.api.v1.endpoints.live.GeminiLive") as MockGeminiLive:

        mock_gemini_instance = AsyncMock()
        MockGeminiLive.return_value = mock_gemini_instance

        async def mock_start_session(*args, **kwargs):
            tools = MockGeminiLive.call_args.kwargs.get("tools")
            tool_mapping = MockGeminiLive.call_args.kwargs.get("tool_mapping")

            if not tools or "execute_midscene_action" not in tool_mapping:
                test_result["error"] = (
                    "execute_midscene_action tool not provided to GeminiLive"
                )
                yield {"type": "turn_complete"}
                return

            tool_func = tool_mapping["execute_midscene_action"]

            # Simulate the model calling the tool
            try:
                # This should send a WS message to client and wait for response
                task = asyncio.create_task(tool_func(action="Click Login"))

                # Give the WS a moment to send the message
                await asyncio.sleep(0.1)

                # Verify we can get the result after the client responds
                # The client will be simulated by the TestClient below
                result = await asyncio.wait_for(task, timeout=2.0)
                if result == "Success from client":
                    test_result["tool_executed"] = True
                    test_result["success"] = True
                else:
                    test_result["error"] = f"Unexpected result: {result}"
            except Exception as e:
                test_result["error"] = f"Tool execution error: {e}"

            yield {"type": "turn_complete"}

        mock_gemini_instance.start_session = mock_start_session

        client = TestClient(app)
        with client.websocket_connect("/api/v1/live/live") as websocket:
            # The backend should send a tool_call message
            try:
                msg = websocket.receive_text()
                payload = json.loads(msg)
                assert payload["type"] == "tool_call"
                assert payload["name"] == "execute_midscene_action"
                assert payload["args"]["action"] == "Click Login"
                call_id = payload.get("call_id")
                assert call_id is not None

                # Simulate the client sending back the response
                response_payload = {
                    "type": "tool_response",
                    "call_id": call_id,
                    "result": "Success from client"
                }
                websocket.send_text(json.dumps(response_payload))

                import time
                time.sleep(1.0) # wait for the backend to process
            except Exception as e:
                test_result["error"] = f"WS client error: {e}"

    assert test_result["success"] is True, test_result["error"]
