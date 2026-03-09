import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview"
FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview"


class FlashWorker:
    """Background worker wrapping Flash Lite (text) and
    Flash Image (image generation) for brainstorm artifacts."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.client = genai.Client(
            api_key=api_key,
            http_options={"api_version": "v1beta"},
        )

    async def generate_markdown(
        self, title: str, raw_ideas: str
    ) -> str:
        """Send raw brainstorm ideas to Flash Lite and get back
        structured markdown."""
        prompt = (
            f"Structure the following brainstorm ideas into a clean,"
            f" well-organized markdown document.\n\n"
            f"Title: {title}\n\n"
            f"Raw ideas:\n{raw_ideas}\n\n"
            f"Return ONLY the markdown content, no extra commentary."
        )
        logger.info(
            "FlashWorker.generate_markdown: title=%r", title
        )

        response = await self.client.aio.models.generate_content(
            model=FLASH_LITE_MODEL,
            contents=prompt,
        )
        return response.text or ""

    async def generate_image(self, prompt: str) -> bytes:
        """Call Flash Image model and extract inline_data bytes."""
        logger.info(
            "FlashWorker.generate_image: prompt=%r", prompt
        )

        response = await self.client.aio.models.generate_content(
            model=FLASH_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["Text", "Image"],
            ),
        )

        if not response.candidates:
            msg = "No candidates in Flash Image response"
            raise ValueError(msg)

        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data

        msg = "No image data in Flash Image response"
        raise ValueError(msg)

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

        response = await self.client.aio.models.generate_content(
            model=FLASH_LITE_MODEL,
            contents=prompt,
        )
        return response.text or ""
