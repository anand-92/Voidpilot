# Flash Worker Service

## Overview

The `flash_worker.py` module provides the `FlashWorker` class, a background worker that wraps various Flash models for text generation, image generation, and video generation. It is primarily used in brainstorm mode to generate multimedia content and process ideas.

Recent updates added prompt-enhancement middleware for media generation so rough brainstorm prompts are automatically rewritten into stronger image/video requests before the generation APIs are called.

## Key Classes

### `FlashWorker`

A background worker that provides async methods for generating content using Google's Flash models.

#### Constructor

```python
def __init__(self, api_key: str, text_model_key: str | None = None) -> None
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `api_key` | `str` | Google API key for authentication |
| `text_model_key` | `str \| None` | Optional key to select text model (default: "gemini-3.1-flash-lite") |

## Persistence Integration

FlashWorker results can be stored persistently when a `sessionId` is provided during the generation process (handled by the brainstorm endpoint):

- **Markdown**: Saved as a `.md` file in Cloud Storage; metadata (title, turns) updated in Firestore.
- **Images**: Saved as a `.png` file in Cloud Storage; metadata (prompt, label) stored in Firestore.
- **Videos**: Saved as a `.mp4` file in Cloud Storage; metadata (prompt, label) stored in Firestore.
- **Titles**: AI-generated titles are saved to the session's Firestore document.

---

## Key Methods

### `generate_markdown`

```python
async def generate_markdown(self, title: str, raw_ideas: str) -> str
```

Takes raw brainstorm ideas and structures them into a clean markdown document.

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | `str` | Title for the brainstorm artifact |
| `raw_ideas` | `str` | Raw brainstorm ideas to structure |

| Returns | Description |
|---------|-------------|
| `str` | Structured markdown content |

### `generate_image`

```python
async def generate_image(self, prompt: str) -> bytes
```

Generates an image using the Flash Image model.

Before the image request is sent, the worker now calls `enhance_image_prompt()` using a structured JSON response from `gemini-3.1-flash-lite-preview`. If enhancement fails or returns invalid JSON, the original prompt is used as a safe fallback.

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Image generation prompt |

| Returns | Description |
|---------|-------------|
| `bytes` | Raw image bytes (JPEG format) |

### `enhance_image_prompt`

```python
async def enhance_image_prompt(self, prompt: str) -> ImagePromptEnhancement
```

Converts a rough image intent into a stronger, more cinematic prompt using a dedicated system instruction and JSON schema.

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Original user image prompt |

| Returns | Description |
|---------|-------------|
| `ImagePromptEnhancement` | Structured model with `enhanced_prompt` |

### `delegate_task`

```python
async def delegate_task(
    self,
    task: str,
    context: str,
    output_format: str = "markdown_section",
) -> str
```

Sends a general-purpose thinking task to Flash Lite for processing.

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | `str` | The task to perform |
| `context` | `str` | Context information for the task |
| `output_format` | `str` | Desired output format (markdown_section, json, summary) |

| Returns | Description |
|---------|-------------|
| `str` | Processed result from Flash Lite |

### `generate_video`

```python
async def generate_video(self, prompt: str) -> bytes
```

Generates a video using Veo 3.1.

Before generation, the worker now calls `enhance_video_prompt()` to improve the prompt and normalize supported Veo parameters.

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Video generation prompt |

| Returns | Description |
|---------|-------------|
| `bytes` | Raw video bytes |

### `enhance_video_prompt`

```python
async def enhance_video_prompt(
    self,
    prompt: str,
    aspect_ratio: str | None = None,
    duration_seconds: int | None = None,
    audio_guidance: str | None = None,
) -> VideoGenerationSettings
```

Builds a cinematic Veo-ready prompt and validates generation settings against supported API values.

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Original user video prompt |
| `aspect_ratio` | `str \| None` | Optional user hint; normalized to `16:9` or `9:16` |
| `duration_seconds` | `int \| None` | Optional user hint; normalized to `4`, `6`, or `8` |
| `audio_guidance` | `str \| None` | Optional dialogue / SFX / ambience guidance |

| Returns | Description |
|---------|-------------|
| `VideoGenerationSettings` | Final prompt plus validated aspect ratio and duration |

## Model Options

### Text Models

| Key | Label | API Model | Supports Grounding |
|-----|-------|-----------|-------------------|
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite-preview` | Yes |
| `gemini-3-flash` | Gemini 3 Flash | `gemini-flash-latest` | Yes |
| `gemini-3.1-pro` | Gemini 3.1 Pro | `gemini-3.1-pro-preview` | Yes |
### Image Model

- **Model**: `gemini-3.1-flash-image-preview`

### Video Model

- **Model**: `veo-3.1-fast-generate-preview`
- **Supported Aspect Ratios**: `16:9`, `9:16`
- **Supported Durations**: `4`, `6`, `8` seconds
- **Defaults**: `16:9`, `8` seconds

## Helper Functions

### `resolve_flash_text_model`

```python
def resolve_flash_text_model(model_key: str | None) -> FlashTextModelOption
```

Resolves a model key to a `FlashTextModelOption` dataclass. Falls back to the default (gemini-3.1-flash-lite) if the key is not recognized.

## Internal Implementation

### `_generate_text`

```python
async def _generate_text(self, prompt: str) -> str
```

Internal method that handles text generation with fallback logic:
1. Attempts to generate with grounding (Google Search) enabled
2. If that fails and grounding is supported, retries without grounding

### Video Generation

The video generation uses a synchronous operation in a thread pool:
1. Normalize or enhance the input prompt and Veo settings
2. Initiate video generation via `generate_videos`
3. Poll the operation until complete
4. Download the generated video
5. Return raw video bytes

## System Interactions

### Upstream Dependencies

- **Google GenAI Client**: Uses `google.genai` for API communication

### Downstream Dependencies

- **Brainstorm Mode**: Used by `src/app/api/v1/endpoints/brainstorm.py` to:
  - Structure brainstorm artifacts into markdown
  - Generate images for brainstorming ideas
  - Delegate complex tasks to Flash Lite
  - Generate videos for brainstorm content

### Data Flow

```
Brainstorm Ideas → generate_markdown() → Markdown Artifact
Image Prompt → generate_image() → Image Bytes
Task + Context → delegate_task() → Processed Result
Video Prompt → generate_video() → Video Bytes
```

## Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FLASH_LITE_MODEL` | `"gemini-3.1-flash-lite-preview"` | Default text model |
| `FLASH_MODEL` | `"gemini-flash-latest"` | Alternative text model |
| `FLASH_PRO_MODEL` | `"gemini-3.1-pro-preview"` | Pro text model |
| `FLASH_IMAGE_MODEL` | `"gemini-3.1-flash-image-preview"` | Image generation model |
| `VEO_VIDEO_MODEL` | `"veo-3.1-fast-generate-preview"` | Video generation model |
| `DEFAULT_FLASH_TEXT_MODEL_KEY` | `"gemini-3.1-flash-lite"` | Default model key |

## Prompt Enhancement Models

- `IMAGE_PROMPT_ENHANCER_SYSTEM_PROMPT` instructs Flash Lite to return JSON with an `enhanced_prompt`
- `VIDEO_PROMPT_ENHANCER_SYSTEM_PROMPT` instructs Flash Lite to return JSON with `enhanced_prompt`, `aspect_ratio`, `duration_seconds`, and optional `audio_guidance`
- Both enhancement flows fall back gracefully when parsing or API calls fail
