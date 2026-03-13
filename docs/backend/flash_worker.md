# Flash Worker Service

## Overview

The `flash_worker.py` module provides the `FlashWorker` class, a background worker that wraps various Flash models for text generation, image generation, and video generation. It is primarily used in brainstorm mode to generate multimedia content and process ideas.

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Image generation prompt |

| Returns | Description |
|---------|-------------|
| `bytes` | Raw image bytes (JPEG format) |

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

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `str` | Video generation prompt |

| Returns | Description |
|---------|-------------|
| `bytes` | Raw video bytes |

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
- **Aspect Ratio**: 16:9
- **Duration**: 4 seconds

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
1. Initiates video generation via `generate_videos`
2. Polls the operation every 10 seconds until complete
3. Downloads the generated video
4. Returns raw video bytes

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
| `VEO_VIDEO_MODEL` | `"veo-3.1-generate-preview"` | Video generation model |
| `DEFAULT_FLASH_TEXT_MODEL_KEY` | `"gemini-3.1-flash-lite"` | Default model key |
