# Tool Definitions Service

## Overview

The `tool_defs.py` module provides shared tool definitions for Gemini Live sessions. These are JSON-serializable tool schemas that define what tools are available to Gemini during conversations, particularly in brainstorm mode.

## Purpose

This module centralizes tool definitions so they can be:
1. Shared across different endpoints (live, brainstorm, walkthrough)
2. Imported by both backend services and frontend code
3. Easily modified without duplicating definitions

## Tool Definitions

### `SAVE_ARTIFACT_TOOL_DEF`

A tool for saving structured brainstorm ideas as markdown artifacts.

| Property | Value |
|----------|-------|
| Name | `save_brainstorm_artifact` |
| Behavior | `NON_BLOCKING` |
| Description | Save structured brainstorm ideas as a markdown artifact. Call this when ideas crystallize into structured content. |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | `string` | Yes | Title for the brainstorm artifact |
| `raw_ideas` | `string` | Yes | Raw brainstorm ideas to structure into markdown |
| `filename` | `string` | Yes | Filename for the artifact (e.g., 'ideas.md') |

---

### `IMAGE_TOOL_DEF`

A tool for generating visual images to support brainstorming.

| Property | Value |
|----------|-------|
| Name | `generate_brainstorm_image` |
| Behavior | `NON_BLOCKING` |
| Description | Generate a visual image to support the brainstorm. Call this when a visual would help illustrate an idea. |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | Yes | Image generation prompt |
| `label` | `string` | Yes | Short label describing what the image shows |

---

### `VIDEO_TOOL_DEF`

A tool for generating videos to support brainstorming using Veo 3.1.

| Property | Value |
|----------|-------|
| Name | `generate_brainstorm_video` |
| Behavior | `NON_BLOCKING` |
| Description | Generate a video to support the brainstorm using Veo 3.1. Call this when a video would help illustrate an idea. |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | `string` | Yes | Video generation prompt describing the scene and motion |
| `label` | `string` | Yes | Short label describing what the video shows |

---

### `DELEGATE_TOOL_DEF`

A tool for delegating tasks to a background Flash worker.

| Property | Value |
|----------|-------|
| Name | `delegate_to_flash` |
| Behavior | `NON_BLOCKING` |
| Description | Delegate an analysis, research synthesis, or structured data extraction task to a background Flash worker. |

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | `string` | Yes | The task to perform |
| `context` | `string` | Yes | Context information for the task |
| `output_format` | `string` | No | Desired output format (`markdown_section`, `json`, `summary`). Defaults to `markdown_section` |

---

## Tool Collections

### `BRAINSTORM_TOOLS`

A list containing all brainstorm mode tools formatted for the Gemini API:

```python
BRAINSTORM_TOOLS = [
    {
        "function_declarations": [
            SAVE_ARTIFACT_TOOL_DEF,
            IMAGE_TOOL_DEF,
            VIDEO_TOOL_DEF,
            DELEGATE_TOOL_DEF,
        ]
    }
]
```

## Tool Behavior

The `behavior` field indicates how tool calls are handled:

| Behavior | Description |
|----------|-------------|
| `NON_BLOCKING` | Tool calls are executed asynchronously and don't block the main conversation flow |

## Usage in GeminiLive

These tool definitions are passed to the `GeminiLive` class:

```python
from app.services.gemini_audio import GeminiLive
from app.services.tool_defs import BRAINSTORM_TOOLS

gemini = GeminiLive(
    api_key="...",
    model="gemini-2.0-flash-exp",
    input_sample_rate=16000,
    tools=BRAINSTORM_TOOLS,
    tool_mapping={
        "save_brainstorm_artifact": save_artifact_function,
        "generate_brainstorm_image": generate_image_function,
        "generate_brainstorm_video": generate_video_function,
        "delegate_to_flash": delegate_task_function,
    }
)
```

## System Interactions

### Upstream Dependencies

- None (these are pure data definitions)

### Downstream Dependencies

Used by:
- `src/app/services/gemini_audio.py` - To load tools into GeminiLive sessions
- `src/app/api/v1/endpoints/brainstorm.py` - To define available tools in brainstorm mode

## Integration with Frontend

The tool definitions may also be imported by the frontend to:
- Display available tools to users
- Show tool descriptions in UI
- Validate tool parameters before sending
