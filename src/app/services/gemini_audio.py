import asyncio
import inspect
import json
import logging
import re
import traceback
import unicodedata
from collections.abc import Mapping, Sequence
from typing import cast

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

CTRL_TOKEN_PATTERN = re.compile(r"<ctrl\d+>", re.IGNORECASE)
MAX_TEXT_CHUNK_OVERLAP = 120
MIN_TEXT_CHUNK_OVERLAP = 2
SPACE_PREFIX_CHARS = frozenset(".!?,:;)]}\"”")
MAX_HISTORY_TURNS = 24
MAX_HISTORY_TEXT_LENGTH = 1200


def _is_safe_live_text_char(char: str) -> bool:
    if char in "\n\r\t":
        return True
    codepoint = ord(char)
    if 0xD800 <= codepoint <= 0xDFFF:
        return False
    return not unicodedata.category(char).startswith("C")


def _sanitize_live_text(text: str) -> str:
    cleaned = CTRL_TOKEN_PATTERN.sub("", text)
    cleaned = "".join(char for char in cleaned if _is_safe_live_text_char(char))
    return cleaned


def _is_live_text_word_char(char: str) -> bool:
    return char.isalnum()


def _is_live_text_overlap_start(text: str, index: int) -> bool:
    if index <= 0:
        return True
    return not _is_live_text_word_char(text[index - 1])


def _is_live_text_overlap_end(text: str, index: int) -> bool:
    if index >= len(text):
        return True
    return not _is_live_text_word_char(text[index])


def _find_live_text_overlap(previous_text: str, next_text: str) -> int:
    max_overlap = min(len(previous_text), len(next_text), MAX_TEXT_CHUNK_OVERLAP)
    for size in range(max_overlap, MIN_TEXT_CHUNK_OVERLAP - 1, -1):
        prefix = next_text[:size]
        if (
            previous_text.endswith(prefix)
            and _is_live_text_overlap_start(previous_text, len(previous_text) - size)
            and _is_live_text_overlap_end(next_text, size)
        ):
            return size
    return 0


def _needs_live_text_separator(previous_text: str, next_text: str) -> bool:
    if not previous_text or not next_text:
        return False

    previous_char = previous_text[-1]
    next_char = next_text[0]
    if previous_char.isspace() or next_char.isspace():
        return False

    return (
        previous_char.isalnum() and next_char.isalnum()
    ) or (previous_char in SPACE_PREFIX_CHARS and next_char.isalnum())


def _merge_live_text(previous_text: str, next_text: str) -> str:
    if not previous_text:
        return next_text
    if not next_text:
        return previous_text

    overlap = _find_live_text_overlap(previous_text, next_text)
    suffix = next_text[overlap:]
    if not suffix:
        return previous_text

    separator = " " if _needs_live_text_separator(previous_text, suffix) else ""
    return previous_text + separator + suffix


def _build_error_event(message: str) -> dict[str, str]:
    return {
        "type": "error",
        "content": message,
        "error": message,
    }


def build_live_history_turns(
    messages: Sequence[Mapping[str, object]] | None,
    *,
    max_turns: int = MAX_HISTORY_TURNS,
    max_text_length: int = MAX_HISTORY_TEXT_LENGTH,
) -> list[types.Content]:
    if (
        not messages
        or not isinstance(messages, Sequence)
        or isinstance(messages, (str, bytes, bytearray))
    ):
        return []

    turns: list[types.Content] = []
    role_map = {
        "user": "user",
        "user_voice": "user",
        "gemini": "model",
        "gemini_voice": "model",
    }

    for message in messages:
        role_value = message.get("role")
        if not isinstance(role_value, str):
            continue

        role = role_map.get(role_value)
        if role is None:
            continue

        if message.get("isToolResponse") is True:
            continue

        content_value = message.get("content")
        if not isinstance(content_value, str):
            continue

        content = _sanitize_live_text(content_value).strip()
        if not content:
            continue

        if len(content) > max_text_length:
            content = content[-max_text_length:]

        turns.append(
            types.Content(
                role=role,
                parts=[types.Part(text=content)],
            )
        )

    if max_turns <= 0:
        return turns

    return turns[-max_turns:]


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
        voice_name: str = "Puck",
        session_resumption_handle: str | None = None,
        history_turns: list[types.Content] | None = None,
        auto_start: bool = False,
        max_tool_calls_per_turn: int | None = None,
    ):
        self.api_key = api_key
        self.model = model
        self.input_sample_rate = input_sample_rate
        self.system_prompt = system_prompt or "You are a helpful desktop assistant."
        self.voice_name = voice_name
        self.session_resumption_handle = session_resumption_handle
        self.history_turns = history_turns or []
        self.auto_start = auto_start
        self.max_tool_calls_per_turn = max_tool_calls_per_turn
        self.client = genai.Client(
            api_key=api_key, http_options={"api_version": "v1beta"}
        )
        self._auto_start_sent = False
        self._pending_model_text = ""
        self._saw_output_transcription_this_turn = False
        self._tool_calls_this_turn = 0
        self._inflight_tool_call_ids: set[str] = set()
        self._completed_tool_call_ids: set[str] = set()
        self._tool_response_lock = asyncio.Lock()
        self._tool_tasks: set[asyncio.Task] = set()

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

    def _buffer_model_text(self, text: str) -> None:
        clean_text = _sanitize_live_text(text)
        if not clean_text.strip():
            return
        self._pending_model_text = _merge_live_text(
            self._pending_model_text,
            clean_text,
        )

    async def _flush_buffered_model_text(self, event_queue: asyncio.Queue) -> None:
        if self._saw_output_transcription_this_turn:
            self._pending_model_text = ""
            return

        if not self._pending_model_text:
            return

        await event_queue.put(
            {
                "type": "text",
                "content": self._pending_model_text,
            }
        )
        self._pending_model_text = ""

    def _reset_turn_state(self) -> None:
        self._pending_model_text = ""
        self._saw_output_transcription_this_turn = False
        self._tool_calls_this_turn = 0

    async def _enqueue_transcription(
        self,
        event_queue: asyncio.Queue,
        role: str,
        text: str,
    ) -> None:
        clean_text = _sanitize_live_text(text)
        if not clean_text.strip():
            return
        if role == "gemini":
            self._saw_output_transcription_this_turn = True
            self._pending_model_text = ""
        await event_queue.put({"type": role, "text": clean_text})

    async def _handle_transcriptions(
        self,
        server_content,
        event_queue: asyncio.Queue,
    ) -> None:
        for role, attr in (
            ("user", "input_transcription"),
            ("gemini", "output_transcription"),
        ):
            transcription = getattr(server_content, attr, None)
            if transcription and transcription.text:
                await self._enqueue_transcription(event_queue, role, transcription.text)

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
                    self._buffer_model_text(part.text)

        await self._handle_transcriptions(server_content, event_queue)

        if getattr(server_content, "generation_complete", False):
            logger.info("Generation complete")
            await event_queue.put({"type": "generation_complete"})

        if server_content.turn_complete:
            await self._flush_buffered_model_text(event_queue)
            logger.info("Turn complete, session continues")
            await event_queue.put({"type": "turn_complete"})
            self._reset_turn_state()

        if server_content.interrupted:
            if audio_interrupt_callback:
                await _call_maybe_async(audio_interrupt_callback)
            self._reset_turn_state()
            await event_queue.put({"type": "interrupted"})

    @staticmethod
    def _tool_call_key(fc) -> str:
        if fc.id:
            return str(fc.id)

        args = fc.args or {}
        try:
            serialized_args = json.dumps(
                args,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            )
        except TypeError:
            serialized_args = repr(args)

        return f"{fc.name}:{serialized_args}"

    async def _send_tool_response(
        self,
        session,
        *,
        fc,
        result: str,
        scheduling: str = "SILENT",
    ) -> None:
        response = types.FunctionResponse(
            name=fc.name,
            id=fc.id,
            response={
                "result": result,
                "scheduling": scheduling,
            },
        )

        try:
            async with self._tool_response_lock:
                await asyncio.sleep(0.05)
                await session.send_tool_response(function_responses=[response])
        except Exception as error:
            logger.error(
                "Error sending tool response for %s: %s",
                fc.name,
                error,
            )
            logger.error(traceback.format_exc())

    async def _dispatch_tool_call(
        self,
        session,
        fc,
        event_queue: asyncio.Queue,
        call_key: str,
    ):
        args = fc.args or {}
        logger.info("Tool call: %s(%s)", fc.name, args)
        try:
            await event_queue.put(
                {
                    "type": "tool_call_start",
                    "name": fc.name,
                }
            )

            if fc.name not in self.tool_mapping:
                await self._send_tool_response(
                    session,
                    fc=fc,
                    result=f"Error: Unsupported tool '{fc.name}'.",
                )
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

            scheduling = "SILENT"
            result_str = result
            if isinstance(result, dict):
                scheduling = result.get("scheduling", "SILENT")
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

            await self._send_tool_response(
                session,
                fc=fc,
                result=str(result_str),
                scheduling=scheduling,
            )
        finally:
            self._inflight_tool_call_ids.discard(call_key)
            self._completed_tool_call_ids.add(call_key)

    async def _handle_tool_call(self, session, tool_call, event_queue: asyncio.Queue):
        """Execute tool calls and send responses without blocking."""
        for fc in tool_call.function_calls:
            call_key = self._tool_call_key(fc)

            if call_key in self._inflight_tool_call_ids:
                logger.info("Skipping in-flight duplicate tool call: %s", call_key)
                continue

            if call_key in self._completed_tool_call_ids:
                logger.info("Skipping completed duplicate tool call: %s", call_key)
                continue

            if (
                self.max_tool_calls_per_turn is not None
                and self._tool_calls_this_turn >= self.max_tool_calls_per_turn
            ):
                logger.info(
                    "Skipping tool call %s; max_tool_calls_per_turn=%s",
                    fc.name,
                    self.max_tool_calls_per_turn,
                )
                self._completed_tool_call_ids.add(call_key)
                await self._send_tool_response(
                    session,
                    fc=fc,
                    result=(
                        "Skipped: Only one generation is allowed per turn in "
                        "Creative Spark. Wait for the user's next request "
                        "before generating another asset."
                    ),
                )
                continue

            self._tool_calls_this_turn += 1
            self._inflight_tool_call_ids.add(call_key)
            # Schedule tool calls as background tasks so they don't block
            # session.receive()
            task = asyncio.create_task(
                self._dispatch_tool_call(session, fc, event_queue, call_key)
            )
            self._tool_tasks.add(task)
            task.add_done_callback(self._tool_tasks.discard)

    async def _wait_for_tool_tasks(self) -> None:
        if not self._tool_tasks:
            return

        pending_tasks = tuple(self._tool_tasks)
        await asyncio.gather(*pending_tasks, return_exceptions=True)

    async def _handle_receive_error(self, error, event_queue: asyncio.Queue):
        """Classify receive errors as fatal or recoverable."""
        error_str = str(error)
        fatal_markers = (
            "1007",
            "1008",
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
                    "content": error_str,
                    "error": error_str,
                }
            )
        else:
            logger.error("Error in receive loop: %s", error)
            logger.error(traceback.format_exc())
            await event_queue.put(_build_error_event(error_str))

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
                if response.go_away is not None:
                    time_left = getattr(
                        response.go_away, "time_left", None
                    )
                    logger.warning(
                        "GoAway received, connection ending in: %s",
                        time_left,
                    )
                    await event_queue.put(
                        {"type": "go_away", "time_left": str(time_left)}
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
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=self.voice_name
                    )
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

        try:
            async with self.client.aio.live.connect(
                model=self.model, config=config
            ) as session:
                logger.info("Session connected.")
                self._reset_turn_state()
                self._tool_tasks.clear()
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

                if self.history_turns and not self.session_resumption_handle:
                    logger.info(
                        "Loading %d historical turns into Gemini session",
                        len(self.history_turns),
                    )
                    history_turns = cast(
                        list[types.Content | types.ContentDict],
                        list(self.history_turns),
                    )
                    await session.send_client_content(
                        turns=history_turns,
                        turn_complete=False,
                    )

                # Auto-start: send an initial user turn to trigger
                # the model to speak first (used by Creative Spark)
                if self.auto_start and not self._auto_start_sent:
                    if self.session_resumption_handle:
                        logger.info(
                            "Auto-start skipped for resumed session handle"
                        )
                    else:
                        logger.info("Auto-start enabled, triggering model")
                        await session.send_client_content(
                            turns=types.Content(
                                role="user",
                                parts=[types.Part(text="Begin!")],
                            ),
                            turn_complete=True,
                        )
                        self._auto_start_sent = True

                receive_task = asyncio.create_task(
                    self._receive_loop(
                        session,
                        event_queue,
                        audio_output_callback,
                        audio_interrupt_callback,
                    )
                )

                try:
                    while True:
                        event = await event_queue.get()
                        if event is None:
                            await self._wait_for_tool_tasks()
                            if not event_queue.empty():
                                continue
                            logger.info("Receive loop ended.")
                            break

                        if event.get("type") == "session_dead":
                            logger.warning(
                                "Session died: %s",
                                event.get("error"),
                            )

                        yield event

                finally:
                    await self._wait_for_tool_tasks()
                    for task in send_tasks:
                        task.cancel()
                    if not receive_task.done():
                        receive_task.cancel()
                        try:
                            await receive_task
                        except asyncio.CancelledError:
                            pass

        except Exception as e:
            logger.error("Failed to connect or session error: %s", e)
            logger.error(traceback.format_exc())
            yield _build_error_event(str(e))
            await asyncio.sleep(1)
