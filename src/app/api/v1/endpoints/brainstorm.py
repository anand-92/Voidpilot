import asyncio
import base64
import logging
import traceback

from fastapi import APIRouter, WebSocket
from starlette.websockets import WebSocketState

from src.app.core.config import settings
from src.app.services.flash_worker import (
    DEFAULT_FLASH_TEXT_MODEL_KEY,
    FLASH_TEXT_MODEL_OPTIONS,
    FlashWorker,
    resolve_flash_text_model,
)
from src.app.services.gemini_audio import GeminiLive
from src.app.services.tool_defs import (
    DELEGATE_TOOL_DEF,
    IMAGE_TOOL_DEF,
    SAVE_ARTIFACT_TOOL_DEF,
    VIDEO_TOOL_DEF,
)
from src.app.services.ws_manager import WebSocketManager

logger = logging.getLogger(__name__)

router = APIRouter()

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
MAX_RETRIES = 3

# Available tool definitions for brainstorm mode (excluding delegate which is internal)
AVAILABLE_TOOL_DEFS = [
    SAVE_ARTIFACT_TOOL_DEF,
    IMAGE_TOOL_DEF,
    VIDEO_TOOL_DEF,
]

DEFAULT_ENABLED_TOOLS = [
    "save_brainstorm_artifact",
    "generate_brainstorm_image",
    "generate_brainstorm_video",
]

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

# ── Tool handler factories ───────────────────────────────────────  # noqa: C901


def _make_tool_handlers(  # noqa: C901
    websocket: WebSocket,
    api_key: str,
    text_model_key: str = DEFAULT_FLASH_TEXT_MODEL_KEY,
    enabled_tools: list[str] | None = None,
):
    """Create brainstorm tool handler functions bound to a
    specific WebSocket and API key.

    Args:
        websocket: The WebSocket connection
        api_key: Google API key
        text_model_key: Flash text model to use
        enabled_tools: List of tool names to enable. If None, all tools are enabled.
                      Note: delegate_to_flash is always included as it's internal.
    """
    flash = FlashWorker(api_key=api_key, text_model_key=text_model_key)
    enabled = (
        enabled_tools if enabled_tools is not None else DEFAULT_ENABLED_TOOLS.copy()
    )

    async def handle_save_artifact(title: str, raw_ideas: str, filename: str) -> dict:
        """Generate markdown via FlashWorker and push to client."""
        try:
            markdown = await flash.generate_markdown(title=title, raw_ideas=raw_ideas)
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_artifact",
                        "filename": filename,
                        "content": markdown,
                    }
                )
            return {"result": f"Artifact '{filename}' saved.", "scheduling": "SILENT"}
        except Exception as e:
            logger.error("save_brainstorm_artifact failed: %s", e)
            return {"result": f"Error saving artifact: {e}", "scheduling": "SILENT"}

    async def handle_generate_media(
        flash_method: str,
        prompt: str,
        label: str,
        result_type: str,
        file_ext: str,
        scheduling: str,
    ) -> dict:
        """Generic handler for image/video generation via FlashWorker."""
        method = getattr(flash, flash_method)
        try:
            data_bytes = await method(prompt=prompt)
            b64_data = base64.b64encode(data_bytes).decode("utf-8")
            filename = label.lower().replace(" ", "_") + "." + file_ext
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": result_type,
                        "filename": filename,
                        "label": label,
                        "data": b64_data,
                    }
                )
            return {
                "result": f"{result_type.replace('brainstorm_', '').title()} "
                f"'{label}' generated.",
                "scheduling": scheduling,
            }
        except Exception as e:
            logger.error("%s failed: %s", flash_method, e)
            return {"result": f"Error: {e}", "scheduling": scheduling}

    async def handle_generate_image(prompt: str, label: str) -> dict:
        """Generate image via FlashWorker with interleaved text and push to client."""
        from src.app.services.flash_worker import FlashImageResult

        try:
            result: FlashImageResult = await flash.generate_image(prompt=prompt)

            # Ensure image bytes exist
            if not result.image_bytes:
                raise ValueError("No image bytes in FlashImageResult")

            # Convert image bytes to base64
            b64_image = base64.b64encode(result.image_bytes).decode("utf-8")
            filename = label.lower().replace(" ", "_") + ".png"

            # Send both image and text to frontend
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_image",
                        "filename": filename,
                        "label": label,
                        "data": b64_image,
                        "text": result.text,  # Include interleaved text
                    }
                )

            return {
                "result": f"Image '{label}' generated.",
                "scheduling": "WHEN_IDLE",
            }
        except Exception as e:
            logger.error("generate_image failed: %s", e)
            return {"result": f"Error generating image: {e}", "scheduling": "WHEN_IDLE"}

    async def handle_generate_video(prompt: str, label: str) -> dict:
        """Generate video via FlashWorker and push to client."""
        return await handle_generate_media(
            "generate_video", prompt, label, "brainstorm_video", "mp4", "WHEN_IDLE"
        )

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
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(
                    {
                        "type": "brainstorm_artifact",
                        "filename": filename,
                        "content": result_text,
                    }
                )
            return {"result": result_text[:200], "scheduling": "WHEN_IDLE"}
        except Exception as e:
            logger.error("delegate_to_flash failed: %s", e)
            return {"result": f"Error delegating task: {e}", "scheduling": "WHEN_IDLE"}

    # Build tool mapping - delegate_to_flash is always included
    mapping: dict = {"delegate_to_flash": handle_delegate}

    # Add handlers for enabled tools using a loop instead of repeated if statements
    tool_handlers = {
        "save_brainstorm_artifact": handle_save_artifact,
        "generate_brainstorm_image": handle_generate_image,
        "generate_brainstorm_video": handle_generate_video,
    }
    for tool_name, handler in tool_handlers.items():
        if tool_name in enabled:
            mapping[tool_name] = handler

    return mapping


def _build_tool_defs(enabled_tools: list[str] | None = None) -> list[dict]:
    """Build tool definitions based on enabled tools.

    Args:
        enabled_tools: List of tool names to enable. If None, all tools are enabled.

    Returns:
        List of tool definitions in Gemini format.
    """
    enabled = enabled_tools if enabled_tools is not None else DEFAULT_ENABLED_TOOLS

    # Always include delegate_to_flash, then add enabled tools
    tool_defs = [DELEGATE_TOOL_DEF]
    tool_defs.extend(
        tool_def
        for tool_def in AVAILABLE_TOOL_DEFS
        if tool_def["name"] in enabled
    )

    return [{"function_declarations": tool_defs}]


# ── WebSocket endpoint ───────────────────────────────────────────  # noqa: E501


@router.websocket("/brainstorm")
async def brainstorm_ws(websocket: WebSocket):  # noqa: C901
    """WebSocket endpoint for Brainstorm Mode sessions."""
    logger.info("New brainstorm WebSocket connection request")
    await websocket.accept()

    api_key = settings.GOOGLE_API_KEY or "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"

    manager = WebSocketManager(websocket, "Brainstorm")

    # Track enabled tools (starts with defaults)
    enabled_tools = DEFAULT_ENABLED_TOOLS.copy()
    tool_defs = _build_tool_defs(enabled_tools)
    tool_mapping = _make_tool_handlers(websocket, api_key, enabled_tools=enabled_tools)

    gemini_client = GeminiLive(
        api_key=api_key,
        model=MODEL,
        input_sample_rate=16000,
        tools=tool_defs,
        tool_mapping=tool_mapping,
        system_prompt=BRAINSTORM_SYSTEM_PROMPT,
    )

    async def handle_client_message(payload: dict) -> bool:
        msg_type = payload.get("type")

        if msg_type == "text":
            content = payload.get("content", "")
            logger.info("Brainstorm received text: %s", content)
            await manager.text_input_queue.put(content)
            return True

        if msg_type == "session_config":
            handle = payload.get("handle")
            if handle:
                gemini_client.session_resumption_handle = handle
                logger.info("Brainstorm received resumption handle")

            # Resolve and select the flash model
            requested_model_key = payload.get("flash_model")
            resolved_model = resolve_flash_text_model(requested_model_key)
            selected_text_model_key = (
                requested_model_key
                if requested_model_key in FLASH_TEXT_MODEL_OPTIONS
                else DEFAULT_FLASH_TEXT_MODEL_KEY
            )

            # Handle tool selection
            requested_tools = payload.get("enabled_tools")
            if requested_tools is not None:
                enabled_tools.clear()
                enabled_tools.extend(requested_tools)
                logger.info("Brainstorm enabled tools: %s", enabled_tools)

            # Update tool definitions and handlers
            new_tool_defs = _build_tool_defs(enabled_tools)
            gemini_client.tools = new_tool_defs

            gemini_client.tool_mapping.clear()
            gemini_client.tool_mapping.update(
                _make_tool_handlers(
                    websocket,
                    api_key,
                    text_model_key=selected_text_model_key,
                    enabled_tools=enabled_tools,
                )
            )
            logger.info(
                "Brainstorm selected flash worker model: %s",
                resolved_model.api_model,
            )
            return True

        return False

    async def run_session() -> None:
        try:
            logger.info("Starting brainstorm Gemini session...")
            async for event in gemini_client.start_session(
                audio_input_queue=manager.audio_input_queue,
                video_input_queue=manager.video_input_queue,
                text_input_queue=manager.text_input_queue,
                audio_output_callback=manager.audio_output_callback,
                audio_interrupt_callback=manager.audio_interrupt_callback,
            ):
                if event:
                    logger.debug("Brainstorm event: %s", event["type"])
                    await manager.forward_gemini_event(event)
            logger.info("Brainstorm session ended normally")
        except Exception as e:
            logger.error("Brainstorm session error: %s", e)
            logger.error(traceback.format_exc())
            await manager.send_to_client({"type": "error", "content": str(e)})

    receive_task = asyncio.create_task(
        manager.receive_from_client(handle_client_message)
    )
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
