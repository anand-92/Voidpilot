import asyncio
import json
import logging
import traceback

from fastapi import WebSocket
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

SYSTEM_PROMPT = (
    "You are a helpful, concise assistant. Respond naturally and briefly. "
    "Do not explain your thought process or internal state. "
    "Just provide the direct response."
)


class GeminiLiveService:
    def __init__(self, api_key: str):
        self.client = genai.Client(
            api_key=api_key, http_options={"api_version": "v1alpha"}
        )
        self.session = None

    async def connect_and_stream(self, websocket: WebSocket):
        logger.info("Starting connection for model: %s", LIVE_MODEL)
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(parts=[types.Part(text=SYSTEM_PROMPT)]),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )

        try:
            logger.info("Attempting to connect to Gemini via SDK...")
            async with self.client.aio.live.connect(
                model=LIVE_MODEL, config=config
            ) as session:
                self.session = session
                logger.info("Connected to Gemini successfully!")

                tasks = [
                    asyncio.create_task(self._websocket_to_gemini(websocket)),
                    asyncio.create_task(self._gemini_to_websocket(websocket)),
                ]
                await asyncio.gather(*tasks)
        except Exception as e:
            logger.exception("Connection failed or closed: %s", e)
            traceback.print_exc()
            if websocket.client_state.name != "DISCONNECTED":
                try:
                    await websocket.close(code=1011)
                except Exception:
                    pass

    async def _websocket_to_gemini(self, websocket: WebSocket):
        try:
            while True:
                message = await websocket.receive()
                if "text" in message:
                    data = json.loads(message["text"])
                    if data.get("type") == "text":
                        logger.info("User: %s", data["text"])
                        await self.session.send(
                            input=types.Content(
                                parts=[types.Part(text=data["text"])],
                                role="user",
                            ),
                            end_of_turn=True,
                        )
                elif "bytes" in message:
                    await self.session.send_realtime_input(
                        audio=types.Blob(
                            data=message["bytes"],
                            mime_type="audio/pcm;rate=16000",
                        )
                    )
        except Exception as e:
            logger.info("WS -> Gemini closed: %s", e)

    async def _gemini_to_websocket(self, websocket: WebSocket):
        try:
            while True:
                async for response in self.session.receive():
                    if response.data:
                        await websocket.send_bytes(response.data)

                    if response.server_content:
                        await self._handle_server_content(
                            websocket, response.server_content
                        )
        except Exception as e:
            logger.info("Gemini -> WS closed: %s", e)

    @staticmethod
    async def _handle_server_content(websocket: WebSocket, server) -> None:
        if server.model_turn:
            await GeminiLiveService._handle_model_turn(websocket, server.model_turn)

        if server.input_transcription:
            text = server.input_transcription.text
            if text:
                logger.info("User Voice: %s", text)
                await websocket.send_json(
                    {"type": "text", "content": f"You (voice): {text}"}
                )

        if server.output_transcription:
            text = server.output_transcription.text
            if text:
                logger.info("Gemini Voice: %s", text)
                await websocket.send_json({"type": "text", "content": text})

        if server.turn_complete:
            await websocket.send_json({"type": "turn_complete"})

    @staticmethod
    async def _handle_model_turn(websocket: WebSocket, model_turn) -> None:
        for part in model_turn.parts:
            if not part.text:
                continue
            if getattr(part, "thought", False):
                logger.info("Gemini Thought: %s", part.text)
                await websocket.send_json({"type": "thought", "content": part.text})
            else:
                logger.info("Gemini: %s", part.text)
                await websocket.send_json({"type": "text", "content": part.text})
