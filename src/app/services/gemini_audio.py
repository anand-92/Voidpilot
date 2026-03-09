import asyncio
import inspect
import logging
import traceback

import httpx
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"


def _weather_code_desc(code: int) -> str:
    """Map Open-Meteo weather code to human-readable description."""
    match code:
        case 0:
            return "Clear sky"
        case c if c <= 3:
            return "Partly cloudy"
        case c if c <= 49:
            return "Foggy"
        case c if c <= 69:
            return "Rainy"
        case c if c <= 79:
            return "Snowy"
        case _:
            return "Stormy"


async def _call_maybe_async(func, *args, **kwargs):
    """Call a function, awaiting it if it's a coroutine function."""
    if inspect.iscoroutinefunction(func):
        return await func(*args, **kwargs)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None, lambda: func(*args, **kwargs)
    )


async def get_weather(
    location: str, unit: str = "fahrenheit", days: int = 0
) -> str:
    """Get current weather or forecast for a location using Open-Meteo
    (free, no API key)."""
    try:
        logger.info(
            "get_weather called: location=%s, unit=%s, days=%d",
            location, unit, days,
        )

        location_clean = location.split(",")[0].strip()
        is_celsius = unit.lower() in ("c", "celsius")
        temp_unit = "celsius" if is_celsius else "fahrenheit"

        async with httpx.AsyncClient() as client:
            # Geocode location to coordinates
            geo_resp = await client.get(
                GEOCODING_URL,
                params={"name": location_clean, "count": 1},
            )
            geo_results = geo_resp.json().get("results")
            if not geo_results:
                return f"Could not find location: {location}"

            place = geo_results[0]
            lat, lon = place["latitude"], place["longitude"]
            location_name = place["name"]

            params: dict = {
                "latitude": lat,
                "longitude": lon,
                "temperature_unit": temp_unit,
            }

            if days > 0:
                return await _get_forecast(
                    client, params, location_name, is_celsius, days
                )
            return await _get_current_weather(
                client, params, location_name, unit
            )
    except Exception as e:
        return f"Error getting weather: {e}"


async def _get_forecast(
    client: httpx.AsyncClient,
    params: dict,
    location_name: str,
    is_celsius: bool,
    days: int,
) -> str:
    """Fetch multi-day forecast from Open-Meteo."""
    params["daily"] = (
        "temperature_2m_max,temperature_2m_min,weather_code"
    )
    params["timezone"] = "auto"
    params["forecast_days"] = min(days, 16)

    resp = await client.get(WEATHER_URL, params=params)
    daily = resp.json()["daily"]
    unit_symbol = "°C" if is_celsius else "°F"

    lines = [f"Weather forecast for {location_name}:"]
    for i, (date, hi, lo, code) in enumerate(
        zip(
            daily["time"],
            daily["temperature_2m_max"],
            daily["temperature_2m_min"],
            daily["weather_code"],
            strict=False,
        )
    ):
        if i == 0:
            day_label = "Today"
        elif i == 1:
            day_label = "Tomorrow"
        else:
            day_label = date

        desc = _weather_code_desc(code)
        lines.append(
            f"{day_label}: {desc}, "
            f"High: {hi}{unit_symbol}, Low: {lo}{unit_symbol}"
        )
    return "\n".join(lines)


async def _get_current_weather(
    client: httpx.AsyncClient,
    params: dict,
    location_name: str,
    unit: str,
) -> str:
    """Fetch current weather from Open-Meteo."""
    params["current_weather"] = "true"

    resp = await client.get(WEATHER_URL, params=params)
    current = resp.json()["current_weather"]
    desc = _weather_code_desc(current.get("weathercode", 0))
    temp = current["temperature"]
    wind = current["windspeed"]

    return (
        f"Current weather in {location_name}: {desc}, "
        f"{temp}°{unit[0].upper()}, Wind: {wind} km/h"
    )

_WEATHER_TOOL_DECL = {
    "name": "get_weather",
    "behavior": "NON_BLOCKING",
    "description": (
        "Get the current weather or forecast for a location in"
        " Fahrenheit. Use this when the user asks about weather."
        " Set days=0 for current weather, or days=1-7 for forecast."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": (
                    "The city name or location to get weather for"
                    " (e.g., 'New York', 'London', 'Tokyo')"
                ),
            },
            "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "Temperature unit - defaults to fahrenheit",
            },
            "days": {
                "type": "integer",
                "description": (
                    "Number of days to forecast"
                    " (0 for current weather, 1-7 for multi-day forecast)"
                ),
            },
        },
        "required": ["location"],
    },
}


class GeminiLive:
    """Handles the interaction with the Gemini Live API."""

    def __init__(
        self,
        api_key,
        model,
        input_sample_rate,
        tools=None,
        tool_mapping=None,
        system_prompt=None,
        session_resumption_handle: str | None = None,
    ):
        self.api_key = api_key
        self.model = model
        self.input_sample_rate = input_sample_rate
        self.system_prompt = (
            system_prompt or "You are a helpful desktop assistant."
        )
        self.session_resumption_handle = session_resumption_handle
        self.client = genai.Client(
            api_key=api_key, http_options={"api_version": "v1beta"}
        )

        default_tools = [
            {"function_declarations": [_WEATHER_TOOL_DECL]}
        ]

        self.tools = default_tools
        if tools:
            for tool_def in tools:
                if (
                    isinstance(tool_def, dict)
                    and "function_declarations" in tool_def
                ):
                    self.tools[0]["function_declarations"].extend(
                        tool_def["function_declarations"]
                    )
                else:
                    self.tools.append(tool_def)

        self.tool_mapping = {"get_weather": get_weather} | (
            tool_mapping or {}
        )

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
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Puck"
                    )
                )
            ),
            system_instruction=types.Content(
                parts=[types.Part(text=self.system_prompt)]
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=self.tools,
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=25600,
                sliding_window=types.SlidingWindow(
                    target_tokens=12800
                ),
            ),
            session_resumption=types.SessionResumptionConfig(
                handle=self.session_resumption_handle,
            ),
        )

        tool_names = [
            fn["name"]
            for t in self.tools
            for fn in t.get("function_declarations", [])
        ]
        logger.info("=== Gemini Live with Tools ===")
        logger.info("Tools loaded: %s", tool_names)
        logger.info("Connecting to model %s...", self.model)

        session_active = True
        try:
            async with self.client.aio.live.connect(
                model=self.model, config=config
            ) as session:
                logger.info("Session connected.")
                audio_mime = (
                    f"audio/pcm;rate={self.input_sample_rate}"
                )

                async def _send_loop(queue, label, build_input):
                    """Generic send loop for audio/video/text."""
                    try:
                        while True:
                            data = await queue.get()
                            if label == "video":
                                logger.info(
                                    "Sending video frame: %d bytes",
                                    len(data),
                                )
                            await session.send_realtime_input(
                                **build_input(data)
                            )
                    except asyncio.CancelledError:
                        logger.info("%s send task cancelled", label)
                    except Exception as e:
                        logger.error("Error in %s send: %s", label, e)

                event_queue: asyncio.Queue = asyncio.Queue()

                async def _handle_server_content(server_content):
                    """Process server content from a Gemini response."""
                    if server_content.model_turn:
                        for part in server_content.model_turn.parts:
                            if part.inline_data:
                                await _call_maybe_async(
                                    audio_output_callback,
                                    part.inline_data.data,
                                )
                            if part.text and not part.text.startswith(
                                "**"
                            ):
                                await event_queue.put(
                                    {
                                        "type": "text",
                                        "content": part.text,
                                    }
                                )

                    transcription = (
                        server_content.input_transcription
                    )
                    if transcription and transcription.text:
                        await event_queue.put(
                            {"type": "user", "text": transcription.text}
                        )

                    transcription = (
                        server_content.output_transcription
                    )
                    if transcription and transcription.text:
                        await event_queue.put(
                            {
                                "type": "gemini",
                                "text": transcription.text,
                            }
                        )

                    if server_content.turn_complete:
                        logger.info("Turn complete, session continues")
                        await event_queue.put(
                            {"type": "turn_complete"}
                        )

                    if server_content.interrupted:
                        if audio_interrupt_callback:
                            await _call_maybe_async(
                                audio_interrupt_callback
                            )
                        await event_queue.put({"type": "interrupted"})

                async def _handle_tool_call(tool_call):
                    """Execute tool calls and send responses."""
                    function_responses = []
                    for fc in tool_call.function_calls:
                        args = fc.args or {}
                        logger.info(
                            "Tool call: %s(%s)", fc.name, args
                        )

                        if fc.name not in self.tool_mapping:
                            continue

                        try:
                            result = await _call_maybe_async(
                                self.tool_mapping[fc.name], **args
                            )
                        except Exception as e:
                            logger.error(
                                "Error executing tool %s: %s",
                                fc.name,
                                e,
                            )
                            logger.error(traceback.format_exc())
                            result = f"Error: {e}"

                        logger.info(
                            "Tool %s result: %.200s...",
                            fc.name,
                            result,
                        )
                        function_responses.append(
                            types.FunctionResponse(
                                name=fc.name,
                                id=fc.id,
                                response={
                                    "result": result,
                                    "scheduling": "WHEN_IDLE",
                                },
                            )
                        )
                        await event_queue.put(
                            {
                                "type": "tool_call",
                                "name": fc.name,
                                "args": args,
                                "result": result,
                            }
                        )

                    if function_responses:
                        await asyncio.sleep(0.05)
                        await session.send_tool_response(
                            function_responses=function_responses
                        )

                async def receive_loop():
                    try:
                        async for response in session.receive():
                            logger.debug(
                                "Received response from Gemini"
                            )
                            if response.server_content:
                                await _handle_server_content(
                                    response.server_content
                                )
                            if response.tool_call:
                                await _handle_tool_call(
                                    response.tool_call
                                )
                            if response.session_resumption_update:
                                update = (
                                    response.session_resumption_update
                                )
                                if (
                                    update.resumable
                                    and update.new_handle
                                ):
                                    await event_queue.put(
                                        {
                                            "type": "session_resumption_update",
                                            "handle": update.new_handle,
                                            "resumable": update.resumable,
                                        }
                                    )
                    except asyncio.CancelledError:
                        logger.info("Receive loop cancelled")
                        await event_queue.put(None)
                    except Exception as e:
                        await _handle_receive_error(e)
                    finally:
                        logger.info("Receive loop finished.")
                        await event_queue.put(None)

                async def _handle_receive_error(error):
                    """Classify receive errors as fatal or recoverable."""
                    error_str = str(error)
                    fatal_markers = (
                        "1007",
                        "invalid frame",
                        "ConnectionClosed",
                    )
                    if any(
                        m.lower() in error_str.lower()
                        for m in fatal_markers
                    ):
                        logger.warning(
                            "Session connection closed: %s", error
                        )
                        await event_queue.put(
                            {
                                "type": "session_dead",
                                "error": error_str,
                            }
                        )
                    else:
                        logger.error(
                            "Error in receive loop: %s", error
                        )
                        logger.error(traceback.format_exc())
                        await event_queue.put(
                            {"type": "error", "error": error_str}
                        )

                send_tasks = [
                    asyncio.create_task(
                        _send_loop(
                            audio_input_queue,
                            "audio",
                            lambda d: {
                                "audio": types.Blob(
                                    data=d, mime_type=audio_mime
                                )
                            },
                        )
                    ),
                    asyncio.create_task(
                        _send_loop(
                            video_input_queue,
                            "video",
                            lambda d: {
                                "video": types.Blob(
                                    data=d, mime_type="image/jpeg"
                                )
                            },
                        )
                    ),
                    asyncio.create_task(
                        _send_loop(
                            text_input_queue,
                            "text",
                            lambda d: {"text": d},
                        )
                    ),
                ]

                try:
                    while session_active:
                        receive_task = asyncio.create_task(
                            receive_loop()
                        )

                        while session_active:
                            try:
                                event = await event_queue.get()
                            except TimeoutError:
                                logger.debug("No events, waiting...")
                                break

                            if event is None:
                                logger.info(
                                    "Receive loop ended, "
                                    "waiting for more input..."
                                )
                                break

                            event_type = event.get("type")

                            if event_type == "turn_complete":
                                logger.info(
                                    "Turn complete, waiting for "
                                    "more user input..."
                                )
                                break

                            if event_type == "session_dead":
                                logger.warning(
                                    "Session died: %s",
                                    event.get("error"),
                                )
                                session_active = False
                                yield {
                                    "type": "error",
                                    "error": "Session connection lost",
                                }
                                break

                            yield event

                        if not receive_task.done():
                            receive_task.cancel()
                            try:
                                await receive_task
                            except asyncio.CancelledError:
                                pass

                        if session_active:
                            await asyncio.sleep(0.5)

                finally:
                    for task in send_tasks:
                        task.cancel()
                    try:
                        receive_task.cancel()
                    except Exception:
                        pass

        except Exception as e:
            logger.error("Failed to connect or session error: %s", e)
            logger.error(traceback.format_exc())
            yield {"type": "error", "error": str(e)}
            await asyncio.sleep(1)
