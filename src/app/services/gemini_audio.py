import asyncio
import inspect
import logging
import traceback

import httpx
from google import genai
from google.genai import types

from src.app.core.config import settings

logger = logging.getLogger(__name__)


async def generate_threejs(description: str) -> str:
    """Generate Three.js code for a 3D scene based on a description.

    Use this when the user wants to create, visualize, or generate a 3D scene,
    animation, or interactive 3D element using Three.js.

    Returns executable JavaScript code that creates a Three.js scene.
    """
    try:
        logger.info(f"generate_threejs called: {description[:100]}...")

        # Use the regular genai client for non-streaming generation
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)

        prompt = f"""Generate Three.js code to create a 3D object or mesh based on
this description:

{description}

IMPORTANT: This code will be added to an EXISTING scene that already has:
- THREE (the Three.js library)
- scene (a THREE.Scene object)
- camera (a THREE.PerspectiveCamera)
- renderer (a THREE.WebGLRenderer)
- controls (optional OrbitControls)

Requirements:
1. Create ONLY the mesh/object code - NO scene/camera/renderer setup
2. Use modern Three.js (ES6 modules)
3. Add animation if appropriate using requestAnimationFrame
4. Make it visually interesting with materials, colors, effects
5. Return ONLY the JavaScript code, no markdown formatting, no explanation
6. The code should add the object directly to the existing 'scene' variable

Example structure (just this part, not the full scene):
```javascript
const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 32);
const material = new THREE.MeshStandardMaterial({{
  color: 0x00ff88,
  metalness: 0.8,
  roughness: 0.2
}});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate() {{
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
}}
animate();
```

Generate the code now:"""

        logger.info("Calling Gemini 3 Flash with code execution...")
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=types.Content(
                    parts=[
                        types.Part(
                            text="You are an expert Three.js developer. You generate clean, working, visually impressive Three.js code. Always include proper lighting, materials, and animations. Use ES6 modules imported from unpkg or esm.sh."  # noqa: E501
                        )
                    ]
                ),
                tools=[types.Tool(code_execution=types.ToolCodeExecution)],
                temperature=0.35,
            ),
        )
        logger.info("API call complete, processing response...")

        code = response.text.strip()

        # Remove markdown code blocks if present
        if code.startswith("```javascript"):
            code = code[13:]
        elif code.startswith("```js"):
            code = code[5:]
        elif code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]

        # Handle edge case where code starts with "```\n"
        if code.startswith("\n"):
            code = code[1:]
        code = code.strip()

        logger.info(f"Generated Three.js code: {len(code)} characters")
        return code

    except Exception as e:
        logger.error(f"Error generating Three.js code: {e}")
        return f"Error generating Three.js code: {str(e)}"


async def generate_image(prompt: str) -> str:
    """Generate an image based on a text prompt using Gemini 3.1 Flash.

    Use this when the user wants to create, generate, or visualize an image, picture,
    illustration, or artwork. The image will be displayed in a fullscreen modal.

    Returns a base64-encoded PNG image that can be displayed in the browser.
    """
    try:
        import base64

        logger.info(f"generate_image called: {prompt[:100]}...")

        client = genai.Client(api_key=settings.GOOGLE_API_KEY)

        logger.info("Calling Gemini 3.1 Flash image generation...")
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-3.1-flash-image-preview",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                thinking_config=types.ThinkingConfig(
                    thinking_level=types.ThinkingLevel.MINIMAL
                ),
                tools=[
                    types.Tool(
                        google_search=types.GoogleSearch(
                            search_types=types.SearchTypes(
                                web_search=types.WebSearch(),
                                image_search=types.ImageSearch(),
                            )
                        )
                    )
                ],
            ),
        )

        logger.info("Processing image response...")

        # Find the image part
        image_data = None
        for part in response.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                break

        if image_data is None:
            return "Error: No image was generated"

        # Convert to base64 for frontend
        b64_data = base64.b64encode(image_data).decode("utf-8")
        logger.info(f"Generated image: {len(b64_data)} base64 chars")

        # Return as data URL
        return f"data:image/png;base64,{b64_data}"

    except Exception as e:
        logger.error(f"Error generating image: {e}")
        import traceback

        logger.error(traceback.format_exc())
        return f"Error generating image: {str(e)}"


async def get_weather(location: str, unit: str = "fahrenheit", days: int = 0) -> str:  # noqa: C901
    """Get current weather or forecast for a location using Open-Meteo
    (free, no API key)."""
    try:
        logger.info(
            f"get_weather called: location={location}, unit={unit}, days={days}"
        )

        # Clean up location - just take the first part before any comma
        location_clean = location.split(",")[0].strip()
        logger.info(f"Cleaned location: {location} -> {location_clean}")

        # First, get coordinates from location name using geocoding
        async with httpx.AsyncClient() as geocode_client:
            geocode_resp = await geocode_client.get(
                "https://geocoding-api.open-meteo.com/v1/search",
                params={"name": location_clean, "count": 1},
            )
            geocode_data = geocode_resp.json()

            if not geocode_data.get("results"):
                return f"Could not find location: {location}"

            lat = geocode_data["results"][0]["latitude"]
            lon = geocode_data["results"][0]["longitude"]
            location_name = geocode_data["results"][0]["name"]

        params = {
            "latitude": lat,
            "longitude": lon,
            "temperature_unit": "celsius"
            if unit.lower() in ["c", "celsius"]
            else "fahrenheit",
        }

        # Simple weather code to description
        def weather_code_desc(code):
            if code == 0:
                return "Clear sky"
            elif code <= 3:
                return "Partly cloudy"
            elif code <= 49:
                return "Foggy"
            elif code <= 69:
                return "Rainy"
            elif code <= 79:
                return "Snowy"
            else:
                return "Stormy"

        if days > 0:
            # Get forecast
            params["daily"] = "temperature_2m_max,temperature_2m_min,weather_code"
            params["timezone"] = "auto"
            params["forecast_days"] = min(days, 16)  # Max 16 days

            async with httpx.AsyncClient() as weather_client:
                weather_resp = await weather_client.get(
                    "https://api.open-meteo.com/v1/forecast", params=params
                )
                weather_data = weather_resp.json()
                daily = weather_data["daily"]
                times = daily["time"]
                max_temps = daily["temperature_2m_max"]
                min_temps = daily["temperature_2m_min"]
                codes = daily["weather_code"]

                unit_symbol = "°C" if unit.lower() in ["c", "celsius"] else "°F"
                result = f"Weather forecast for {location_name}:\n"
                for i, (time, max_temp, min_temp, code) in enumerate(
                    zip(times, max_temps, min_temps, codes, strict=False)
                ):
                    if i == 0:
                        day = "Today"
                    elif i == 1:
                        day = "Tomorrow"
                    else:
                        day = time
                    result += f"{day}: {weather_code_desc(code)}, High: {max_temp}{unit_symbol}, Low: {min_temp}{unit_symbol}\n"  # noqa: E501
                return result.strip()
        else:
            # Get current weather
            params["current_weather"] = "true"

            async with httpx.AsyncClient() as weather_client:
                weather_resp = await weather_client.get(
                    "https://api.open-meteo.com/v1/forecast", params=params
                )
                weather_data = weather_resp.json()
                current = weather_data["current_weather"]

                temp = current["temperature"]
                wind = current["windspeed"]
                weather_desc = weather_code_desc(current.get("weathercode", 0))

                return f"Current weather in {location_name}: {weather_desc}, {temp}°{unit[0].upper()}, Wind: {wind} km/h"  # noqa: E501
    except Exception as e:
        return f"Error getting weather: {str(e)}"


class GeminiLive:
    """
    Handles the interaction with the Gemini Live API.
    """

    def __init__(
        self, api_key, model, input_sample_rate, tools=None, tool_mapping=None
    ):
        self.api_key = api_key
        self.model = model
        self.input_sample_rate = input_sample_rate
        # Use v1alpha as per example
        self.client = genai.Client(
            api_key=api_key, http_options={"api_version": "v1alpha"}
        )

        # Default weather tool
        default_tools = [
            {
                "function_declarations": [
                    {
                        "name": "get_weather",
                        "description": "Get the current weather or forecast for a location in Fahrenheit. Use this when the user asks about weather. Set days=0 for current weather, or days=1-7 for forecast.",  # noqa: E501
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "location": {
                                    "type": "string",
                                    "description": "The city name or location to get weather for (e.g., 'New York', 'London', 'Tokyo')",  # noqa: E501
                                },
                                "unit": {
                                    "type": "string",
                                    "enum": ["celsius", "fahrenheit"],
                                    "description": "Temperature unit - defaults to fahrenheit",  # noqa: E501
                                },
                                "days": {
                                    "type": "integer",
                                    "description": "Number of days to forecast (0 for current weather, 1-7 for multi-day forecast)",  # noqa: E501
                                },
                            },
                            "required": ["location"],
                        },
                    }
                ]
            }
        ]

        # Merge provided tools into defaults (combine declarations or append groups)
        self.tools = default_tools
        if tools:
            if isinstance(tools, list) and "function_declarations" in tools[0]:
                self.tools[0]["function_declarations"].extend(
                    tools[0]["function_declarations"]
                )
            else:
                self.tools.extend(tools)

        default_tool_mapping = {
            "get_weather": get_weather,
        }
        self.tool_mapping = default_tool_mapping | (tool_mapping or {})

    async def start_session(  # noqa: C901
        self,
        audio_input_queue,
        video_input_queue,
        text_input_queue,
        audio_output_callback,
        audio_interrupt_callback=None,
    ):
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text="You are a helpful desktop assistant.")]
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            proactivity=types.ProactivityConfig(proactive_audio=True),
            enable_affective_dialog=True,
            tools=self.tools,
        )

        logger.info("=== Gemini Live with Tools (Weather + ThreeJS Generator) ===")
        logger.info(
            f"Tools loaded: {[t['function_declarations'][0]['name'] for t in self.tools]}"  # noqa: E501
        )
        logger.info(f"Connecting to model {self.model}...")
        session_active = True
        try:
            async with self.client.aio.live.connect(
                model=self.model, config=config
            ) as session:
                logger.info("Session connected.")

                async def send_audio():
                    try:
                        while True:
                            chunk = await audio_input_queue.get()
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=chunk,
                                    mime_type=f"audio/pcm;rate={self.input_sample_rate}",  # noqa: E501
                                )
                            )
                    except asyncio.CancelledError:
                        logger.info("send_audio task cancelled")
                    except Exception as e:
                        logger.error(f"Error in send_audio: {e}")

                async def send_video():
                    try:
                        while True:
                            chunk = await video_input_queue.get()
                            logger.info(
                                f"Sending video frame to Gemini: {len(chunk)} bytes"
                            )
                            await session.send_realtime_input(
                                video=types.Blob(data=chunk, mime_type="image/jpeg")
                            )
                    except asyncio.CancelledError:
                        logger.info("send_video task cancelled")
                    except Exception as e:
                        logger.error(f"Error in send_video: {e}")

                async def send_text():
                    try:
                        while True:
                            text = await text_input_queue.get()
                            logger.info(f"Sending text to Gemini: {text}")
                            await session.send_realtime_input(text=text)
                    except asyncio.CancelledError:
                        logger.info("send_text task cancelled")
                    except Exception as e:
                        logger.error(f"Error in send_text: {e}")

                event_queue = asyncio.Queue()

                async def receive_loop():  # noqa: C901
                    try:
                        async for response in session.receive():
                            logger.debug("Received response from Gemini")
                            server_content = response.server_content
                            tool_call = response.tool_call

                            if server_content:
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            if inspect.iscoroutinefunction(
                                                audio_output_callback
                                            ):
                                                await audio_output_callback(
                                                    part.inline_data.data
                                                )
                                            else:
                                                audio_output_callback(
                                                    part.inline_data.data
                                                )
                                        if part.text:
                                            # Skip internal thinking traces (text starting with **)  # noqa: E501
                                            if not part.text.startswith("**"):
                                                await event_queue.put(
                                                    {
                                                        "type": "text",
                                                        "content": part.text,
                                                    }
                                                )

                                if (
                                    server_content.input_transcription
                                    and server_content.input_transcription.text
                                ):
                                    await event_queue.put(
                                        {
                                            "type": "user",
                                            "text": server_content.input_transcription.text,  # noqa: E501
                                        }
                                    )

                                if (
                                    server_content.output_transcription
                                    and server_content.output_transcription.text
                                ):
                                    await event_queue.put(
                                        {
                                            "type": "gemini",
                                            "text": server_content.output_transcription.text,  # noqa: E501
                                        }
                                    )

                                if server_content.turn_complete:
                                    logger.info(
                                        "Turn complete, but session continues waiting for more input"  # noqa: E501
                                    )
                                    await event_queue.put({"type": "turn_complete"})
                                    # Don't break - keep the session alive for more input  # noqa: E501

                                if server_content.interrupted:
                                    if audio_interrupt_callback:
                                        if inspect.iscoroutinefunction(
                                            audio_interrupt_callback
                                        ):
                                            await audio_interrupt_callback()
                                        else:
                                            audio_interrupt_callback()
                                    await event_queue.put({"type": "interrupted"})

                            if tool_call:
                                function_responses = []
                                for fc in tool_call.function_calls:
                                    func_name = fc.name
                                    args = fc.args or {}
                                    logger.info(f"Tool call: {func_name}({args})")

                                    if func_name in self.tool_mapping:
                                        try:
                                            tool_func = self.tool_mapping[func_name]
                                            logger.info(
                                                f"Tool function is coroutine: {inspect.iscoroutinefunction(tool_func)}"  # noqa: E501
                                            )
                                            if inspect.iscoroutinefunction(tool_func):
                                                logger.info(
                                                    f"Awaiting tool {func_name}..."
                                                )
                                                result = await tool_func(**args)
                                                logger.info(
                                                    f"Tool {func_name} completed"
                                                )
                                            else:
                                                logger.info(
                                                    f"Running sync tool {func_name} in executor..."  # noqa: E501
                                                )
                                                loop = asyncio.get_running_loop()
                                                result = await loop.run_in_executor(
                                                    None, lambda tf=tool_func, a=args: tf(**a)  # noqa: E501
                                                )
                                        except Exception as e:
                                            logger.error(
                                                f"Error executing tool {func_name}: {e}"
                                            )
                                            logger.error(traceback.format_exc())
                                            result = f"Error: {e}"

                                        logger.info(
                                            f"Tool {func_name} result: {result[:200]}..."  # noqa: E501
                                        )

                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=func_name,
                                                id=fc.id,
                                                response={"result": result},
                                            )
                                        )
                                        await event_queue.put(
                                            {
                                                "type": "tool_call",
                                                "name": func_name,
                                                "args": args,
                                                "result": result,
                                            }
                                        )

                                if function_responses:
                                    # Small delay to avoid race conditions with Gemini API  # noqa: E501
                                    await asyncio.sleep(0.05)
                                    await session.send_tool_response(
                                        function_responses=function_responses
                                    )

                    except asyncio.CancelledError:
                        logger.info("Receive loop cancelled")
                        await event_queue.put(None)
                    except Exception as e:
                        error_str = str(e)
                        # Check for connection/API errors that indicate session is dead
                        if (
                            "1007" in error_str
                            or "invalid frame" in error_str.lower()
                            or "ConnectionClosed" in error_str
                        ):
                            logger.warning(f"Session connection closed or invalid: {e}")
                            # Session is dead - signal this to stop the loop
                            await event_queue.put(
                                {"type": "session_dead", "error": error_str}
                            )
                        else:
                            logger.error(f"Error in receive loop: {e}")
                            logger.error(traceback.format_exc())
                            await event_queue.put({"type": "error", "error": str(e)})
                    finally:
                        logger.info("Receive loop finished.")
                        await event_queue.put(None)

                send_audio_task = asyncio.create_task(send_audio())
                send_video_task = asyncio.create_task(send_video())
                send_text_task = asyncio.create_task(send_text())

                # Track if we're waiting for new input after a turn
                waiting_for_input = False

                try:
                    while session_active:
                        # Start receiving in a task
                        receive_task = asyncio.create_task(receive_loop())
                        waiting_for_input = False

                        # Process events from the queue
                        while session_active:
                            try:
                                event = await event_queue.get()
                            except TimeoutError:
                                # No events - wait for more input
                                logger.debug("No events, waiting for more input...")
                                if (
                                    audio_input_queue.empty()
                                    and video_input_queue.empty()
                                    and text_input_queue.empty()
                                ):
                                    waiting_for_input = True
                                    logger.info(
                                        "No more input, waiting for user to speak..."
                                    )
                                    break
                                continue

                            if event is None:
                                # Receive loop ended (e.g., after turn_complete)
                                logger.info(
                                    "Receive loop ended, waiting for more user input..."
                                )
                                waiting_for_input = True
                                break

                            # Don't end session on turn_complete - keep waiting for more input  # noqa: E501
                            if event.get("type") == "turn_complete":
                                logger.info(
                                    "Turn complete, waiting for more user input..."
                                )
                                waiting_for_input = True
                                # Break to restart receive loop
                                break

                            # Handle session death (connection errors)
                            if event.get("type") == "session_dead":
                                logger.warning(f"Session died: {event.get('error')}")
                                session_active = False
                                yield {
                                    "type": "error",
                                    "error": "Session connection lost",
                                }
                                break

                            yield event

                        # Clean up receive task if still running
                        if not receive_task.done():
                            receive_task.cancel()
                            try:
                                await receive_task
                            except asyncio.CancelledError:
                                pass

                        # If waiting for input, just wait - the send tasks will handle incoming data  # noqa: E501
                        if waiting_for_input:
                            # Wait a bit then check if there's new input
                            await asyncio.sleep(0.5)

                finally:
                    send_audio_task.cancel()
                    send_video_task.cancel()
                    send_text_task.cancel()
                    try:
                        receive_task.cancel()
                    except Exception:
                        pass

        except Exception as e:
            logger.error(f"Failed to connect or session error: {e}")
            logger.error(traceback.format_exc())
            # Yield the error but don't end the session - wait for reconnect
            yield {"type": "error", "error": str(e)}
            # Wait for a bit then try to continue
            await asyncio.sleep(1)
