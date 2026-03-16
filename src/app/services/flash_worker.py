import asyncio
import json
import logging
import time
from dataclasses import dataclass

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview"
FLASH_MODEL = "gemini-flash-latest"
FLASH_PRO_MODEL = "gemini-3.1-pro-preview"
FLASH_IMAGE_MODEL = "gemini-3.1-flash-image-preview"
FLASH_IMAGE_SYSTEM_INSTRUCTION = (
    "You are a creative helper working alongside a voice assistant. "
    "When asked to generate images, create visually appealing images. "
    "Think of yourself as a skilled "
    "designer creating assets to support the conversation."
)
VEO_VIDEO_MODEL = "veo-3.1-fast-generate-preview"
DEFAULT_IMAGE_ASPECT_RATIO = "1:1"
DEFAULT_VIDEO_ASPECT_RATIO = "16:9"
DEFAULT_VIDEO_DURATION_SECONDS = 8
LOWEST_VIDEO_RESOLUTION = "720p"
ALLOWED_IMAGE_ASPECT_RATIOS = frozenset(
    {
        "1:1",
        "3:2",
        "2:3",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9",
        "1:4",
        "4:1",
        "1:8",
        "8:1",
    }
)
ALLOWED_VIDEO_ASPECT_RATIOS = frozenset({"16:9", "9:16"})
ALLOWED_VIDEO_DURATION_SECONDS = frozenset({4, 6, 8})
IMAGE_PROMPT_ENHANCER_SYSTEM_PROMPT = (
    "You are a prompt enhancement worker for Gemini 3.1 Flash Image "
    "(Nano Banana). Your job is to convert rough user intent into a precise, "
    "high-quality image-generation prompt that follows best practices. "
    "Preserve the user's core intent while adding useful detail and structure. "
    "Use positive framing: describe what should be present, not what should be "
    "absent. Prefer a strong action verb near the start. When the prompt is "
    "underspecified, improve it using this framework: [Subject] + [Action] + "
    "[Location/context] + [Composition] + [Style]. Be specific about subject, "
    "lighting, textures, composition, camera angle, lens or focus cues, and "
    "overall style when they materially improve the result. For blank-canvas "
    "generation, turn keyword fragments into a narrative visual brief instead of "
    "a bag of tags. Use photographic and cinematic language such as low angle, "
    "aerial view, close-up, wide shot, shallow depth of field, or macro lens when "
    "helpful. Do not invent reference-image workflows, attached assets, editing "
    "operations, or multimodal inputs unless the user explicitly supplied them. "
    "Do not mention unsupported API mechanics. Return only valid JSON that matches "
    "the schema, with one field: enhanced_prompt."
)
VIDEO_PROMPT_ENHANCER_SYSTEM_PROMPT = (
    "You are a prompt enhancement worker for Veo 3.1. Convert rough user intent "
    "into a cinematic video-generation prompt and choose only supported API "
    "parameters. Preserve the user's intent while improving clarity, motion, and "
    "scene direction. Use this framework when enriching prompts: [Cinematography] "
    "+ [Subject] + [Action] + [Context] + [Style & Ambiance]. Cinematography is "
    "important: prefer explicit camera language such as dolly shot, tracking shot, "
    "crane shot, aerial view, slow pan, POV shot, wide shot, close-up, low angle, "
    "shallow depth of field, wide-angle lens, soft focus, or deep focus when it "
    "helps. Make the action visually and temporally clear. Add mood, lighting, and "
    "environment details that improve the shot. If audio would improve the result, "
    "include concise audio guidance covering dialogue, sound effects, or ambient "
    "sound. Use positive framing. Do not invent reference-image workflows, first/last "
    "frame workflows, ingredients workflows, or edit operations unless the user "
    "explicitly requested them. Choose only supported aspect ratios: 16:9 or 9:16. "
    "Choose only supported durations: 4, 6, or 8 seconds. Never output unsupported "
    "values. If the user gives a supported aspect ratio or duration, preserve it. "
    "If the user does not specify them, choose the most sensible supported values. "
    "Return only valid JSON matching the schema with fields: enhanced_prompt, "
    "aspect_ratio, duration_seconds, and optional audio_guidance."
)
FLASH_LITE_CONFIG = types.GenerateContentConfig(
    tools=[types.Tool(google_search=types.GoogleSearch())],
)
PLAIN_TEXT_CONFIG = types.GenerateContentConfig()


class ImagePromptEnhancement(BaseModel):
    enhanced_prompt: str


class VideoPromptEnhancement(BaseModel):
    enhanced_prompt: str
    aspect_ratio: str | None = None
    duration_seconds: int | None = None
    audio_guidance: str | None = None


@dataclass(frozen=True)
class VideoGenerationSettings:
    prompt: str
    aspect_ratio: str
    duration_seconds: int


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

    async def _generate_json(
        self,
        prompt: str,
        schema: type[BaseModel],
        system_prompt: str,
    ):
        response = await self.client.aio.models.generate_content(
            model=FLASH_LITE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_json_schema=schema.model_json_schema(),
            ),
        )
        text = response.text or ""
        return schema.model_validate_json(text)

    @staticmethod
    def _fallback_image_prompt(prompt: str) -> ImagePromptEnhancement:
        return ImagePromptEnhancement(enhanced_prompt=prompt)

    @staticmethod
    def _normalize_video_settings(
        prompt: str,
        aspect_ratio: str | None = None,
        duration_seconds: int | None = None,
        audio_guidance: str | None = None,
    ) -> VideoGenerationSettings:
        resolved_aspect_ratio = (
            aspect_ratio
            if aspect_ratio in ALLOWED_VIDEO_ASPECT_RATIOS
            else DEFAULT_VIDEO_ASPECT_RATIO
        )
        resolved_duration = (
            duration_seconds
            if duration_seconds in ALLOWED_VIDEO_DURATION_SECONDS
            else DEFAULT_VIDEO_DURATION_SECONDS
        )

        final_prompt = prompt
        if audio_guidance and audio_guidance.strip():
            final_prompt = f"{prompt}\n\nAudio guidance: {audio_guidance.strip()}"

        return VideoGenerationSettings(
            prompt=final_prompt,
            aspect_ratio=resolved_aspect_ratio,
            duration_seconds=resolved_duration,
        )

    async def enhance_image_prompt(self, prompt: str) -> ImagePromptEnhancement:
        try:
            return await self._generate_json(
                prompt=(
                    "Enhance this image generation prompt for Gemini 3.1 Flash Image. "
                    "User prompt:\n"
                    f"{prompt}"
                ),
                schema=ImagePromptEnhancement,
                system_prompt=IMAGE_PROMPT_ENHANCER_SYSTEM_PROMPT,
            )
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Image prompt enhancement fallback: %s", exc)
            return self._fallback_image_prompt(prompt)
        except Exception as exc:
            logger.warning("Image prompt enhancement request failed: %s", exc)
            return self._fallback_image_prompt(prompt)

    async def enhance_video_prompt(
        self,
        prompt: str,
        aspect_ratio: str | None = None,
        duration_seconds: int | None = None,
        audio_guidance: str | None = None,
    ) -> VideoGenerationSettings:
        fallback = self._normalize_video_settings(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            duration_seconds=duration_seconds,
            audio_guidance=audio_guidance,
        )
        try:
            enhanced = await self._generate_json(
                prompt=(
                    "Enhance this video generation prompt for Veo 3.1.\n"
                    f"User prompt: {prompt}\n"
                    f"Requested aspect ratio: {aspect_ratio or 'unspecified'}\n"
                    f"Requested duration: {duration_seconds or 'unspecified'}\n"
                    f"Audio guidance: {audio_guidance or 'unspecified'}"
                ),
                schema=VideoPromptEnhancement,
                system_prompt=VIDEO_PROMPT_ENHANCER_SYSTEM_PROMPT,
            )
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Video prompt enhancement fallback: %s", exc)
            return fallback
        except Exception as exc:
            logger.warning("Video prompt enhancement request failed: %s", exc)
            return fallback

        return self._normalize_video_settings(
            prompt=enhanced.enhanced_prompt or prompt,
            aspect_ratio=aspect_ratio or enhanced.aspect_ratio,
            duration_seconds=duration_seconds or enhanced.duration_seconds,
            audio_guidance=audio_guidance or enhanced.audio_guidance,
        )

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
        """Call Flash Image model and return image bytes only."""
        enhancement = await self.enhance_image_prompt(prompt)
        enhanced_prompt = enhancement.enhanced_prompt or prompt
        logger.info("FlashWorker.generate_image: prompt=%r", enhanced_prompt)

        response = await self.client.aio.models.generate_content(
            model=FLASH_IMAGE_MODEL,
            contents=enhanced_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["Image"],
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

        image_data: bytes | None = None

        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and getattr(inline_data, "data", None):
                image_data = inline_data.data

        if not image_data:
            msg = "No image data in Flash Image response"
            raise ValueError(msg)

        return image_data

    async def delegate_task(
        self,
        task: str,
        context: str = "",
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

    async def generate_video(
        self,
        prompt: str,
        aspect_ratio: str | None = None,
        duration_seconds: int | None = None,
        audio_guidance: str | None = None,
    ) -> bytes:
        """Generate video via Veo 3.1 and return video bytes."""
        settings = await self.enhance_video_prompt(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            duration_seconds=duration_seconds,
            audio_guidance=audio_guidance,
        )
        logger.info("FlashWorker.generate_video: prompt=%r", settings.prompt)

        config = types.GenerateVideosConfig(
            aspect_ratio=settings.aspect_ratio,
            duration_seconds=settings.duration_seconds,
            resolution=LOWEST_VIDEO_RESOLUTION,
        )

        # Run sync video generation in thread pool since the SDK
        # uses sync operations for long-running video generation
        def generate_sync():
            operation = self.client.models.generate_videos(
                model=VEO_VIDEO_MODEL,
                prompt=settings.prompt,
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
