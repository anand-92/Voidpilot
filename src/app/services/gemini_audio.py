import asyncio
import inspect
import logging
import traceback

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


async def _call_maybe_async(func, *args, **kwargs):
    """Call a function, awaiting it if it's a coroutine function."""
    if inspect.iscoroutinefunction(func):
        return await func(*args, **kwargs)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))


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
        self.system_prompt = system_prompt or "You are a helpful desktop assistant."
        self.session_resumption_handle = session_resumption_handle
        self.client = genai.Client(
            api_key=api_key, http_options={"api_version": "v1beta"}
        )

        self.tools: list[dict] = []
        self.tool_mapping: dict = {}

        if tools:
            for tool_def in tools:
                if isinstance(tool_def, dict) and "function_declarations" in tool_def:
                    if self.tools:
                        self.tools[0]["function_declarations"].extend(
                            tool_def["function_declarations"]
                        )
                    else:
                        self.tools.append(tool_def)
                else:
                    self.tools.append(tool_def)

        self.tool_mapping |= tool_mapping or {}

    async def _send_loop(self, session, queue, label, build_input):
        """Generic send loop for audio/video/text."""
        try:
            while True:
                data = await queue.get()
                if label == "video":
                    logger.info("Sending video frame: %d bytes", len(data))
                await session.send_realtime_input(**build_input(data))
        except asyncio.CancelledError:
            logger.info("%s send task cancelled", label)
        except Exception as e:
            logger.error("Error in %s send: %s", label, e)

    async def _handle_server_content(
        self,
        server_content,
        event_queue: asyncio.Queue,
        audio_output_callback,
        audio_interrupt_callback,
    ):
        if server_content.model_turn:
            for part in server_content.model_turn.parts:
                if part.inline_data:
                    await _call_maybe_async(
                        audio_output_callback,
                        part.inline_data.data,
                    )
                if part.text and not part.text.startswith("**"):
                    await event_queue.put(
                        {
                            "type": "text",
                            "content": part.text,
                        }
                    )

        transcription = server_content.input_transcription
        if transcription and transcription.text:
            await event_queue.put({"type": "user", "text": transcription.text})

        transcription = server_content.output_transcription
        if transcription and transcription.text:
            await event_queue.put(
                {
                    "type": "gemini",
                    "text": transcription.text,
                }
            )

        if server_content.turn_complete:
            logger.info("Turn complete, session continues")
            await event_queue.put({"type": "turn_complete"})

        if server_content.interrupted:
            if audio_interrupt_callback:
                await _call_maybe_async(audio_interrupt_callback)
            await event_queue.put({"type": "interrupted"})

    async def _dispatch_tool_call(self, session, fc, event_queue: asyncio.Queue):
        args = fc.args or {}
        logger.info("Tool call: %s(%s)", fc.name, args)

        await event_queue.put(
            {
                "type": "tool_call_start",
                "name": fc.name,
            }
        )

        if fc.name not in self.tool_mapping:
            return None

        try:
            result = await _call_maybe_async(self.tool_mapping[fc.name], **args)
        except Exception as e:
            logger.error(
                "Error executing tool %s: %s",
                fc.name,
                e,
            )
            logger.error(traceback.format_exc())
            result = f"Error: {e}"

        scheduling = "WHEN_IDLE"
        result_str = result
        if isinstance(result, dict):
            scheduling = result.get("scheduling", "WHEN_IDLE")
            result_str = result.get("result", str(result))

        logger.info(
            "Tool %s result: %.200s...",
            fc.name,
            result_str,
        )

        await event_queue.put(
            {
                "type": "tool_call",
                "name": fc.name,
                "args": args,
                "result": result,
            }
        )

        response = types.FunctionResponse(
            name=fc.name,
            id=fc.id,
            response={
                "result": result_str,
                "scheduling": scheduling,
            },
        )

        await asyncio.sleep(0.05)
        await session.send_tool_response(function_responses=[response])

    async def _handle_tool_call(self, session, tool_call, event_queue: asyncio.Queue):
        """Execute tool calls and send responses without blocking."""
        for fc in tool_call.function_calls:
            # Schedule tool calls as background tasks so they don't block
            # session.receive()
            asyncio.create_task(
                self._dispatch_tool_call(session, fc, event_queue)
            )

    async def _handle_receive_error(self, error, event_queue: asyncio.Queue):
        """Classify receive errors as fatal or recoverable."""
        error_str = str(error)
        fatal_markers = (
            "1007",
            "1011",
            "invalid frame",
            "ConnectionClosed",
            "The service is currently unavailable",
        )
        if any(m.lower() in error_str.lower() for m in fatal_markers):
            logger.warning("Session connection closed: %s", error)
            await event_queue.put(
                {
                    "type": "session_dead",
                    "error": error_str,
                }
            )
        else:
            logger.error("Error in receive loop: %s", error)
            logger.error(traceback.format_exc())
            await event_queue.put({"type": "error", "error": error_str})

    async def _receive_loop(
        self,
        session,
        event_queue: asyncio.Queue,
        audio_output_callback,
        audio_interrupt_callback,
    ):
        try:
            async for response in session.receive():
                logger.debug("Received response from Gemini")
                if response.server_content:
                    await self._handle_server_content(
                        response.server_content,
                        event_queue,
                        audio_output_callback,
                        audio_interrupt_callback,
                    )
                if response.tool_call:
                    await self._handle_tool_call(
                        session, response.tool_call, event_queue
                    )
                if response.session_resumption_update:
                    update = response.session_resumption_update
                    if update.resumable and update.new_handle:
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
            await self._handle_receive_error(e, event_queue)
        finally:
            logger.info("Receive loop finished.")
            await event_queue.put(None)

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
                parts=[types.Part(text=self.system_prompt)]
            ),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=self.tools,  # type: ignore
            context_window_compression=types.ContextWindowCompressionConfig(
                trigger_tokens=25600,
                sliding_window=types.SlidingWindow(target_tokens=12800),
            ),
            session_resumption=types.SessionResumptionConfig(
                handle=self.session_resumption_handle,
            ),
        )

        tool_names = [
            fn["name"] for t in self.tools for fn in t.get("function_declarations", [])
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
                audio_mime = f"audio/pcm;rate={self.input_sample_rate}"
                event_queue: asyncio.Queue = asyncio.Queue()

                send_tasks = [
                    asyncio.create_task(
                        self._send_loop(
                            session,
                            audio_input_queue,
                            "audio",
                            lambda d: {
                                "audio": types.Blob(data=d, mime_type=audio_mime)
                            },
                        )
                    ),
                    asyncio.create_task(
                        self._send_loop(
                            session,
                            video_input_queue,
                            "video",
                            lambda d: {
                                "video": types.Blob(data=d, mime_type="image/jpeg")
                            },
                        )
                    ),
                    asyncio.create_task(
                        self._send_loop(
                            session,
                            text_input_queue,
                            "text",
                            lambda d: {"text": d},
                        )
                    ),
                ]

                try:
                    while session_active:
                        receive_task = asyncio.create_task(
                            self._receive_loop(
                                session,
                                event_queue,
                                audio_output_callback,
                                audio_interrupt_callback,
                            )
                        )

                        while session_active:
                            try:
                                event = await event_queue.get()
                            except TimeoutError:
                                logger.debug("No events, waiting...")
                                break

                            if event is None:
                                logger.info(
                                    "Receive loop ended, waiting for more input..."
                                )
                                break

                            event_type = event.get("type")

                            if event_type == "turn_complete":
                                logger.info(
                                    "Turn complete, waiting for more user input..."
                                )
                                yield event
                                break

                            if event_type == "session_dead":
                                logger.warning("Session died: %s", event.get("error"))
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
