import asyncio
import os
from google import genai
from google.genai import types

async def test_live():
    key = open('.env').read().strip().split('=')[1]
    client = genai.Client(api_key=key, http_options={"api_version": "v1beta"})
    
    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        proactivity=types.ProactivityConfig(proactive_audio=True),
        enable_affective_dialog=True,
    )
    
    model = "gemini-2.0-flash-lite"
    try:
        print(f"Connecting to {model}...")
        async with client.aio.live.connect(model=model, config=config) as session:
            print("Connected successfully with affective dialog and proactivity!")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_live())
