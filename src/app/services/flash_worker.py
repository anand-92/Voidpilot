import logging
from dataclasses import dataclass

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview"
FLASH_MODEL = "gemini-3-flash-preview"
FLASH_PRO_MODEL = "gemini-3.1-pro-preview"
FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview"
FLASH_LITE_CONFIG = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())],
)
PLAIN_TEXT_CONFIG = types.GenerateContentConfig()


@dataclass(frozen=True)
class FlashTextModelOption:
    label: str
    api_model: str
    supports_grounding: bool = True


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

    async def generate_image(self, prompt: str) -> bytes:
        """Call Flash Image model and extract inline_data bytes."""
        logger.info("FlashWorker.generate_image: prompt=%r", prompt)

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

        first_candidate = response.candidates[0]
        if first_candidate.content and first_candidate.content.parts:
            for part in first_candidate.content.parts:
                if part.inline_data and part.inline_data.data:
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

        return await self._generate_text(prompt)
