import asyncio
import base64
import json
import logging
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.app.core.config import settings
from src.app.services.flash_worker import (
    DEFAULT_FLASH_TEXT_MODEL_KEY,
    FLASH_TEXT_MODEL_OPTIONS,
    FlashWorker,
    resolve_flash_text_model,
)
from src.app.services.gemini_audio import GeminiLive

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3

BRAINSTORM_SYSTEM_PROMPT = """\
You are Voidpilot in Brainstorm Mode — a creative thinking partner.
Your job is to help the user develop and refine their ideas.

Behavior:
- Ask probing questions to deepen ideas
- Offer alternative perspectives and 'what if' scenarios
- Identify connections between ideas the user might miss
- Challenge weak assumptions constructively
- Summarize progress periodically
- NEVER speak out long generations that could/should be files.
- If you are generating content, structured ideas, lists, or code,\
  DO NOT speak it out loud. You MUST use a tool call instead to\
  create a file for the user to read.
- Your voice should only be used to communicate WITH the user,\
  not to dictate content AT the user.

Artifact generation:
- Your tools run in the background — do NOT pause the conversation to wait \
for them.
- Call save_brainstorm_artifact when ideas crystallize into\
  structured content, instead of speaking them.
- Call generate_brainstorm_image when a visual would help the brainstorm.
- Call delegate_to_flash when you need analysis, research synthesis, or \
structured data extraction, instead of speaking it.
- Keep talking to the user while tools execute. You'll be notified when they \
complete."""

# ── Tool declarations ────────────────────────────────────────────  # noqa: E501

SAVE_ARTIFACT_TOOL_DEF = {
    "name": "save_brainstorm_artifact",
    "behavior": "NON_BLOCKING",
    "description": (
        "Save structured brainstorm ideas as a markdown artifact."
        " Call this when ideas crystallize into structured content."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Title for the brainstorm artifact",
            },
            "raw_ideas": {
                "type": "string",
                "description": ("Raw brainstorm ideas to structure into markdown"),
            },
            "filename": {
                "type": "string",
                "description": ("Filename for the artifact (e.g. 'ideas.md')"),
            },
        },
        "required": ["title", "raw_ideas", "filename"],
    },
}

IMAGE_TOOL_DEF = {
    "name": "generate_brainstorm_image",
    "behavior": "NON_BLOCKING",
    "description": (
        "Generate a visual image to support the brainstorm."
        " Call this when a visual would help illustrate an idea."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Image generation prompt",
            },
            "label": {
                "type": "string",
                "description": ("Short label describing what the image shows"),
            },
        },
        "required": ["prompt", "label"],
    },
}

DELEGATE_TOOL_DEF = {
    "name": "delegate_to_flash",
    "behavior": "NON_BLOCKING",
    "description": (
        "Delegate an analysis, research synthesis, or structured"
        " data extraction task to a background Flash worker."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "task": {
                "type": "string",
                "description": "The task to perform",
            },
            "context": {
                "type": "string",
                "description": ("Context information for the task"),
            },
            "output_format": {
                "type": "string",
                "enum": [
                    "markdown_section",
                    "json",
                    "summary",
                ],
                "description": ("Desired output format (defaults to markdown_section)"),  # noqa: E501
            },
        },
        "required": ["task", "context"],
    },
}

BRAINSTORM_TOOLS = [
    {
        "function_declarations": [
            SAVE_ARTIFACT_TOOL_DEF,
            IMAGE_TOOL_DEF,
            DELEGATE_TOOL_DEF,
        ]
    }
]


# ── Tool handler factories ───────────────────────────────────────  # noqa: E501


def _make_tool_handlers(
    websocket: WebSocket,
    api_key: str,
    text_model_key: str = DEFAULT_FLASH_TEXT_MODEL_KEY,
):
    """Create brainstorm tool handler functions bound to a
    specific WebSocket and API key."""
    flash = FlashWorker(api_key=api_key, text_model_key=text_model_key)

    async def handle_save_artifact(title: str, raw_ideas: str, filename: str) -> dict:
        """Generate markdown via FlashWorker and push to client."""
        try:
            markdown = await flash.generate_markdown(title=title, raw_ideas=raw_ideas)
            from starlette.websockets import WebSocketState

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_artifact",
                        "filename": filename,
                        "content": markdown,
                    }
                )
            return {
                "result": f"Artifact '{filename}' saved.",
                "scheduling": "SILENT",
            }
        except Exception as e:
            logger.error("save_brainstorm_artifact failed: %s", e)
            return {
                "result": f"Error saving artifact: {e}",
                "scheduling": "SILENT",
            }

    async def handle_generate_image(prompt: str, label: str) -> dict:
        """Generate image via FlashWorker and push to client."""
        try:
            image_bytes = await flash.generate_image(prompt=prompt)
            b64_data = base64.b64encode(image_bytes).decode("utf-8")
            filename = label.lower().replace(" ", "_") + ".png"
            from starlette.websockets import WebSocketState

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_image",
                        "filename": filename,
                        "label": label,
                        "data": b64_data,
                    }
                )
            return {
                "result": f"Image '{label}' generated.",
                "scheduling": "WHEN_IDLE",
            }
        except Exception as e:
            logger.error("generate_brainstorm_image failed: %s", e)
            return {
                "result": f"Error generating image: {e}",
                "scheduling": "WHEN_IDLE",
            }

    async def handle_delegate(
        task: str,
        context: str,
        output_format: str = "markdown_section",
    ) -> dict:
        """Delegate task to FlashWorker and push result."""
        try:
            result_text = await flash.delegate_task(
                task=task,
                context=context,
                output_format=output_format,
            )
            filename = task[:30].lower().replace(" ", "_") + ".md"
            from starlette.websockets import WebSocketState

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_artifact",
                        "filename": filename,
                        "content": result_text,
                    }
                )
            return {
                "result": result_text[:200],
                "scheduling": "WHEN_IDLE",
            }
        except Exception as e:
            logger.error("delegate_to_flash failed: %s", e)
            return {
                "result": f"Error delegating task: {e}",
                "scheduling": "WHEN_IDLE",
            }

    mapping = {
        "save_brainstorm_artifact": handle_save_artifact,
        "generate_brainstorm_image": handle_generate_image,
        "delegate_to_flash": handle_delegate,
    }
    return mapping


# ── WebSocket endpoint ───────────────────────────────────────────  # noqa: E501


@router.websocket("/brainstorm")
async def brainstorm_ws(websocket: WebSocket):  # noqa: C901
    """WebSocket endpoint for Brainstorm Mode sessions."""
    logger.info("New brainstorm WebSocket connection request")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"

    audio_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    video_input_queue: asyncio.Queue[bytes] = asyncio.Queue()
    text_input_queue: asyncio.Queue[str] = asyncio.Queue()

    tool_mapping = _make_tool_handlers(websocket, api_key)

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        tools=BRAINSTORM_TOOLS,
        tool_mapping=tool_mapping,
        system_prompt=BRAINSTORM_SYSTEM_PROMPT,
        include_default_tools=False,
    )

    async def send_to_client(payload: dict) -> None:
        try:
            from starlette.websockets import WebSocketState

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(payload)
        except Exception as e:
            logger.error("Error sending to client: %s", e)

    async def handle_client_message(payload: dict) -> bool:
        """Handle a parsed JSON message. Returns True if handled."""
        msg_type = payload.get("type")

        if msg_type == "text":
            content = payload.get("content", "")
            logger.info("Brainstorm received text: %s", content)
            await text_input_queue.put(content)
            return True

        if msg_type == "session_config":
            handle = payload.get("handle")
            if handle:
                gemini_client.session_resumption_handle = handle
                logger.info("Brainstorm received resumption handle")

            requested_model_key = payload.get("flash_model")
            resolved_model = resolve_flash_text_model(requested_model_key)
            selected_text_model_key = next(
                (
                    key
                    for key, option in FLASH_TEXT_MODEL_OPTIONS.items()
                    if option == resolved_model
                ),
                DEFAULT_FLASH_TEXT_MODEL_KEY,
            )

            # Update the gemini_client's tool_mapping with new handlers bound to the correct model  # noqa: E501
            gemini_client.tool_mapping.clear()
            gemini_client.tool_mapping.update(
                _make_tool_handlers(
                    websocket,
                    api_key,
                    text_model_key=selected_text_model_key,
                )
            )
            logger.info(
                "Brainstorm selected flash worker model: %s",
                resolved_model.api_model,
            )
            return True

        return False

    async def receive_from_client() -> None:
        try:
            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    await audio_input_queue.put(message["bytes"])
                    continue

                text = message.get("text")
                if not text:
                    continue

                try:
                    payload = json.loads(text)
                except json.JSONDecodeError:
                    payload = None

                if isinstance(payload, dict):
                    if await handle_client_message(payload):
                        continue

                logger.info("Brainstorm received raw text: %s", text)
                await text_input_queue.put(text)
        except (WebSocketDisconnect, RuntimeError) as e:
            is_normal = isinstance(e, WebSocketDisconnect) or (
                "disconnect" in str(e).lower()
            )
            if is_normal:
                logger.info("Brainstorm client disconnected")
            else:
                logger.error("RuntimeError in brainstorm receiver: %s", e)
                logger.error(traceback.format_exc())
        except Exception as e:
            logger.error("Error receiving from brainstorm client: %s", e)
            logger.error(traceback.format_exc())

    async def forward_gemini_event(event: dict) -> None:
        event_type = event.get("type")
        if event_type in ("user", "gemini"):
            await send_to_client(
                {
                    "type": "text",
                    "role": event_type,
                    "content": event.get("text", event.get("content", "")),
                }
            )
        elif event_type == "session_resumption_update":
            await send_to_client(event)
        else:
            await send_to_client(event)

    async def audio_output_callback(data: bytes) -> None:
        await send_to_client({"type": "audio", "content": data.hex()})

    async def audio_interrupt_callback() -> None:
        await send_to_client({"type": "interrupted"})

    async def run_session() -> None:
        """Run one brainstorm Gemini session."""
        try:
            logger.info("Starting brainstorm Gemini session...")
            async for event in gemini_client.start_session(
                audio_input_queue=audio_input_queue,
                video_input_queue=video_input_queue,
                text_input_queue=text_input_queue,
                audio_output_callback=audio_output_callback,
                audio_interrupt_callback=audio_interrupt_callback,
            ):
                if event:
                    logger.debug("Brainstorm event: %s", event["type"])
                    await forward_gemini_event(event)
            logger.info("Brainstorm session ended normally")
        except Exception as e:
            logger.error("Brainstorm session error: %s", e)
            logger.error(traceback.format_exc())
            await send_to_client({"type": "error", "content": str(e)})

    receive_task = asyncio.create_task(receive_from_client())
    try:
        for attempt in range(MAX_RETRIES):
            await run_session()
            if attempt >= MAX_RETRIES - 1:
                break
            logger.info(
                "Brainstorm session retry (%d/%d)...",
                attempt + 1,
                MAX_RETRIES,
            )
            await asyncio.sleep(1)
    finally:
        logger.info("Cleaning up brainstorm WebSocket...")
        receive_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass
