import asyncio
import logging
import time
from dataclasses import dataclass

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview"
FLASH_MODEL = "gemini-3-flash-preview"
FLASH_PRO_MODEL = "gemini-3.1-pro-preview"
FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview"
FLASH_IMAGE_SYSTEM_INSTRUCTION = (
    "You are a creative helper working alongside a voice assistant. "
    "When asked to generate images, create visually appealing images "
    "with brief explanatory text. Think of yourself as a skilled "
    "designer creating assets to support the conversation."
)
VEO_VIDEO_MODEL = "veo-3.1-fast-generate-preview"
FLASH_LITE_CONFIG = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())],
)
PLAIN_TEXT_CONFIG = types.GenerateContentConfig()


@dataclass(frozen=True)
class FlashTextModelOption:
    label: str
    api_model: str
    supports_grounding: bool = True


@dataclass(frozen=True)
class FlashImageResult:
    """Result from interleaved image generation containing text and image."""
    text: str
    image_bytes: bytes | None

    def __eq__(self, other: object) -> bool:
        if isinstance(other, (bytes, bytearray)):
            return self.image_bytes == bytes(other)
        return super().__eq__(other)


FLASH_TEXT_MODEL_OPTIONS = {
    "gemini-3.1-flash-lite": FlashTextModelOption(
        label="Gemini 3.1 Flash Lite",
        api_model=FLASH_LITE_MODEL,
    ),
    "gemini-3-flash": FlashTextModelOption(
        label="Gemini 3 Flash",
        api_model=FLASH_MODEL,
    ),
    "gemini-3.1-pro": FlashTextModelOption(
        label="Gemini 3.1 Pro",
        api_model=FLASH_PRO_MODEL,
    ),
}
DEFAULT_FLASH_TEXT_MODEL_KEY = "gemini-3.1-flash-lite"


def resolve_flash_text_model(model_key: str | None) -> FlashTextModelOption:
    if not model_key:
        return FLASH_TEXT_MODEL_OPTIONS[DEFAULT_FLASH_TEXT_MODEL_KEY]

    return FLASH_TEXT_MODEL_OPTIONS.get(
        model_key,
        FLASH_TEXT_MODEL_OPTIONS[DEFAULT_FLASH_TEXT_MODEL_KEY],
    )


class FlashWorker:
    """Background worker wrapping Flash Lite (text) and
    Flash Image (image generation) for brainstorm artifacts."""

    def __init__(self, api_key: str, text_model_key: str | None = None) -> None:
        self.api_key = api_key
        self.text_model = resolve_flash_text_model(text_model_key)
        self.client = genai.Client(
            api_key=api_key,
            http_options={"api_version": "v1beta"},
        )

    async def _generate_text(self, prompt: str) -> str:
        config = (
            FLASH_LITE_CONFIG
            if self.text_model.supports_grounding
            else PLAIN_TEXT_CONFIG
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.text_model.api_model,
                contents=prompt,
                config=config,
            )
        except Exception as exc:
            if not self.text_model.supports_grounding:
                raise

            logger.warning(
                "FlashWorker grounding retry without Google Search for %s: %s",
                self.text_model.api_model,
                exc,
            )
            response = await self.client.aio.models.generate_content(
                model=self.text_model.api_model,
                contents=prompt,
                config=PLAIN_TEXT_CONFIG,
            )

        return response.text or ""

    async def generate_markdown(self, title: str, raw_ideas: str) -> str:
        """Send raw brainstorm ideas to Flash Lite and get back
        structured markdown."""
        prompt = (
            f"Structure the following brainstorm ideas into a clean,"
            f" well-organized markdown document.\n\n"
            f"Title: {title}\n\n"
            f"Raw ideas:\n{raw_ideas}\n\n"
            f"Return ONLY the markdown content, no extra commentary."
        )
        logger.info("FlashWorker.generate_markdown: title=%r", title)

        return await self._generate_text(prompt)

    async def generate_image(self, prompt: str) -> FlashImageResult:
        """Call Flash Image model and extract interleaved text + image bytes.

        Returns FlashImageResult with both text and image data.
        """
        logger.info("FlashWorker.generate_image: prompt=%r", prompt)

        response = await self.client.aio.models.generate_content(
            model=FLASH_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"],
                system_instruction=FLASH_IMAGE_SYSTEM_INSTRUCTION,
            ),
        )

        candidates = getattr(response, "candidates", []) or []
        first_candidate = next(iter(candidates), None)

        if not first_candidate:
            msg = "No candidates in Flash Image response"
            raise ValueError(msg)

        content = getattr(first_candidate, "content", None)
        parts = getattr(content, "parts", []) or []

        text_parts: list[str] = []
        image_data: bytes | None = None

        for part in parts:
            # Extract text content
            text = getattr(part, "text", None)
            if isinstance(text, str) and text:
                text_parts.append(text)

            # Extract image data
            inline_data = getattr(part, "inline_data", None)
            if inline_data and getattr(inline_data, "data", None):
                image_data = inline_data.data

        combined_text = "\n".join(text_parts)

        if not image_data:
            msg = "No image data in Flash Image response"
            raise ValueError(msg)

        return FlashImageResult(text=combined_text, image_bytes=image_data)

    async def delegate_task(
        self,
        task: str,
        context: str,
        output_format: str = "markdown_section",
    ) -> str:
        """Send a general-purpose thinking task to Flash Lite."""
        prompt = (
            f"Task: {task}\n\n"
            f"Context:\n{context}\n\n"
            f"Output format: {output_format}\n\n"
            f"Provide a thorough, well-structured response."
        )
        logger.info(
            "FlashWorker.delegate_task: task=%r, format=%s",
            task,
            output_format,
        )

        return await self._generate_text(prompt)

    async def generate_video(self, prompt: str) -> bytes:
        """Generate video via Veo 3.1 and return video bytes."""
        logger.info("FlashWorker.generate_video: prompt=%r", prompt)

        config = types.GenerateVideosConfig(
            aspect_ratio="16:9",
            duration_seconds=4,
        )

        # Run sync video generation in thread pool since the SDK
        # uses sync operations for long-running video generation
        def generate_sync():
            operation = self.client.models.generate_videos(
                model=VEO_VIDEO_MODEL,
                prompt=prompt,
                config=config,
            )

            while not operation.done:
                logger.info("Waiting for video generation to complete...")
                time.sleep(10)
                operation = self.client.operations.get(operation)

            if not operation.response or not operation.response.generated_videos:
                msg = "No videos generated in Veo response"
                raise ValueError(msg)

            generated_video = operation.response.generated_videos[0]
            video = generated_video.video
            if not video:
                msg = "No video file in generated video response"
                raise ValueError(msg)

            self.client.files.download(file=video)
            video_bytes = video.video_bytes
            if not video_bytes:
                msg = "No video bytes in downloaded video"
                raise ValueError(msg)

            return video_bytes

        return await asyncio.to_thread(generate_sync)
