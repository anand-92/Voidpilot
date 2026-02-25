import asyncio
import json
import logging
from typing import Any

from google import genai
from google.genai import types
from fastapi import WebSocket

from src.app.core.config import settings

logger = logging.getLogger(__name__)

# Use the latest multimodal live model
LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


class GeminiLiveService:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key, http_options={"api_version": "v1alpha"})
        self.session = None

    async def connect_and_stream(self, websocket: WebSocket):
        print(f"[Live] Starting connection for model: {LIVE_MODEL}")
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text="You are a helpful assistant.")]),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        try:
            async with self.client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
                self.session = session
                print("[Live] Connected to Gemini successfully!")
                
                tasks = [
                    asyncio.create_task(self._websocket_to_gemini(websocket)),
                    asyncio.create_task(self._gemini_to_websocket(websocket))
                ]
                
                await asyncio.gather(*tasks)
        except Exception as e:
            print(f"[Live] Connection failed: {e}")
            if not websocket.client_state.name == "DISCONNECTED":
                await websocket.close(code=1011)

    async def _websocket_to_gemini(self, websocket: WebSocket):
        try:
            while True:
                message = await websocket.receive()
                if "text" in message:
                    data = json.loads(message["text"])
                    if data.get("type") == "text":
                        print(f"[Live] User: {data['text']}")
                        await self.session.send(
                            input=types.Content(parts=[types.Part(text=data["text"])], role="user"),
                            end_of_turn=True
                        )
                elif "bytes" in message:
                    await self.session.send_realtime_input(
                        audio=types.Blob(data=message["bytes"], mime_type="audio/pcm;rate=16000")
                    )
        except Exception as e:
            print(f"[Live] WS -> Gemini closed: {e}")

    async def _gemini_to_websocket(self, websocket: WebSocket):
        try:
            while True:
                async for response in self.session.receive():
                    if response.data:
                        await websocket.send_bytes(response.data)
                        
                    if response.server_content:
                        if response.server_content.model_turn:
                            for part in response.server_content.model_turn.parts:
                                if part.text:
                                    print(f"Gemini: {part.text}")
                                    await websocket.send_json({"type": "text", "content": part.text})
                                    
                        if response.server_content.input_transcription:
                            text = response.server_content.input_transcription.text
                            if text:
                                print(f"User Voice: {text}")
                                await websocket.send_json({"type": "text", "content": f"You (voice): {text}"})
                                
                        if response.server_content.output_transcription:
                            text = response.server_content.output_transcription.text
                            if text:
                                print(f"Gemini Voice: {text}")
                                await websocket.send_json({"type": "text", "content": text})
                                
                        if response.server_content.turn_complete:
                            await websocket.send_json({"type": "turn_complete"})
        except Exception as e:
            print(f"[Live] Gemini -> WS closed: {e}")
