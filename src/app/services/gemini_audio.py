import os
import asyncio
import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

PROJECT_ID = "gen-lang-client-0579048282"
LOCATION = "us-central1"
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

# Use Google Cloud API
client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)


CONFIG = types.LiveConnectConfig(
    response_modalities=[
        "AUDIO",
    ],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")
        )
    ),
)


class GeminiAudioBridge:
    def __init__(self, websocket):
        self.websocket = websocket
        self.session = None

    async def handle_client(self):
        """Handle messages from the frontend client."""
        try:
            while True:
                message = await self.websocket.receive()

                if "text" in message:
                    import json
                    data = json.loads(message["text"])
                    if data.get("type") == "text":
                        text = data.get("content", "")
                        logger.info(f"Received text from client: {text}")
                        if self.session is not None:
                            await self.session.send(input=text or ".", end_of_turn=True)

                elif "bytes" in message:
                    # Binary audio data from frontend (PCM 16kHz)
                    audio_bytes = message["bytes"]
                    logger.info(f"Received audio from client: {len(audio_bytes)} bytes")
                    if self.session is not None:
                        await self.session.send(
                            input=types.Blob(
                                data=audio_bytes,
                                mime_type="audio/pcm;rate=16000"
                            )
                        )
        except Exception as e:
            logger.error(f"Client handler error: {e}")

    async def handle_gemini(self):
        """Forward responses from Gemini to frontend."""
        try:
            while True:
                if self.session is not None:
                    turn = self.session.receive()
                    async for response in turn:
                        # Send audio to frontend
                        if data := response.data:
                            await self.websocket.send_json({
                                "type": "audio",
                                "content": data.hex()
                            })
                        # Send text transcription to frontend
                        if text := response.text:
                            await self.websocket.send_json({
                                "type": "text",
                                "content": text
                            })
        except Exception as e:
            logger.error(f"Gemini handler error: {e}")

    async def run(self):
        """Main entry point - connect to Gemini and relay messages."""
        try:
            async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
                self.session = session
                logger.info("Connected to Gemini Live")

                # Run both handlers concurrently
                await asyncio.gather(
                    self.handle_client(),
                    self.handle_gemini()
                )

        except Exception as e:
            logger.error(f"Gemini audio bridge error: {e}")
            await self.websocket.close(code=1011)
