# Brainstorm Mode API Endpoint

## Overview

The Brainstorm Mode endpoint (`/api/v1/live/brainstorm`) provides a creative workspace for generating multimedia content. It's designed as a thinking partner that helps develop and refine ideas using various tools.

## REST Endpoints (Persistence & Library)

The brainstorm feature includes a set of REST endpoints for managing persistent sessions, powered by Firebase.

### 1. Session Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/live/brainstorm/sessions` | `GET` | Required | List current user's persistent brainstorm sessions |
| `/api/v1/live/brainstorm/sessions` | `POST` | Required | Create a new persistent brainstorm session |
| `/api/v1/live/brainstorm/sessions/{id}` | `GET` | Required | Retrieve a specific persistent session with its full transcript and artifact list |
| `/api/v1/live/brainstorm/sessions/{id}` | `DELETE` | Required | Delete a brainstorm session and its associated artifacts from Firestore and Cloud Storage |
| `/api/v1/live/brainstorm/sessions/{id}/title` | `PATCH` | Required | Update a session's title (manually or AI-generated) |

### 2. Turn & Artifact Persistence

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/live/brainstorm/sessions/{id}/turns` | `PUT` | Required | Save the full conversation transcript (turns) for a session |
| `/api/v1/live/brainstorm/sessions/{id}/artifacts` | `PUT` | Required | Save an artifact's metadata and content to Cloud Storage and Firestore |
| `/api/v1/live/brainstorm/sessions/{id}/artifacts/{artifact_id}/download` | `GET` | Required | Download a specific artifact with correct filename quoting (RFC 5987) |

### 3. Public Sharing

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/live/brainstorm/sessions/{id}/share` | `POST` | Required | Generate a public share token for a session |
| `/api/v1/live/brainstorm/share/{token}` | `GET` | Optional | Retrieve a shared session's read-only transcript and artifact list |
| `/api/v1/live/brainstorm/share/{token}/artifacts/{artifact_id}/download` | `GET` | Optional | Download an artifact from a public share link |

### 4. Anonymous Access

The brainstorm mode supports **Guest Mode** for unauthenticated users. Sessions in Guest Mode are ephemeral and do not use the REST persistence endpoints.

---

## WebSocket Path

```
WS /api/v1/live/brainstorm
```

## Model Configuration

- **Model**: `gemini-2.5-flash-native-audio-preview-12-2025` (Live Session)
- **Input Sample Rate**: 16000 Hz (microphone input)
- **Output Sample Rate**: 24000 Hz (audio playback)
- **Max Retries**: 3
- **Default Flash Worker Model**: `gemini-3.1-flash-lite-preview`

## System Prompt

The brainstorm mode uses a custom system prompt that defines the AI's behavior:

```python
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
```

## Available Tools

### 1. save_brainstorm_artifact

Saves structured brainstorm ideas as a markdown artifact.

```json
{
  "name": "save_brainstorm_artifact",
  "parameters": {
    "title": "Project Ideas",
    "raw_ideas": "Ideas about the new feature...",
    "filename": "project_ideas.md"
  }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | string | Title for the brainstorm artifact |
| `raw_ideas` | string | Raw brainstorm ideas to structure into markdown |
| `filename` | string | Filename for the artifact (e.g., 'ideas.md') |

### 2. generate_brainstorm_image

Generates a visual image to support the brainstorm using Veo.

```json
{
  "name": "generate_brainstorm_image",
  "parameters": {
    "prompt": "A modern office space with creative ideas floating",
    "label": "Creative Workspace"
  }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Image generation prompt |
| `label` | string | Short label describing what the image shows |

### 3. generate_brainstorm_video

Generates a video to support the brainstorm using Veo 3.1.

```json
{
  "name": "generate_brainstorm_video",
  "parameters": {
    "prompt": "Animated ideas transforming into reality",
    "label": "Idea Transformation"
  }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Video generation prompt describing the scene and motion |
| `label` | string | Short label describing what the video shows |

### 4. delegate_to_flash

Delegates analysis, research synthesis, or structured data extraction tasks to a background Flash worker.

```json
{
  "name": "delegate_to_flash",
  "parameters": {
    "task": "Analyze the pros and cons",
    "context": "Context about the decision...",
    "output_format": "markdown_section"
  }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | string | The task to perform |
| `context` | string | Context information for the task |
| `output_format` | string | Desired output format: `markdown_section`, `json`, or `summary` |

## Client Messages (Client → Server)

### Text Message

```json
{
  "type": "text",
  "content": "Let's brainstorm about new app features"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `content` | string | The text content to send to Gemini |

### Session Configuration Message

```json
{
  "type": "session_config",
  "handle": "session_resumption_handle",
  "flash_model": "gemini-2.0-flash-exp",
  "enabled_tools": ["save_brainstorm_artifact", "generate_brainstorm_image"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"session_config"` |
| `handle` | string (optional) | Session resumption handle for continuing a previous session |
| `flash_model` | string (optional) | Flash model to use for tool execution |
| `enabled_tools` | array (optional) | List of tool names to enable |

## Server Messages (Server → Client)

### Audio Message

```json
{
  "type": "audio",
  "content": "hex_encoded_audio_data..."
}
```

### Text Message

```json
{
  "type": "text",
  "role": "gemini",
  "content": "That's a great idea! Let me help you develop it further."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"text"` |
| `role` | string | Either `"user"` or `"gemini"` |
| `content` | string | The text content |

### Tool Call Message

```json
{
  "type": "tool_call",
  "name": "save_brainstorm_artifact",
  "args": {
    "title": "Project Ideas",
    "raw_ideas": "Ideas...",
    "filename": "ideas.md"
  },
  "result": "Artifact 'ideas.md' saved."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"tool_call"` |
| `name` | string | The name of the tool being called |
| `args` | object | The arguments passed to the tool |
| `result` | string | The result of the tool execution |

### Brainstorm Artifact Message

```json
{
  "type": "brainstorm_artifact",
  "filename": "project_ideas.md",
  "content": "# Project Ideas\n\n## Overview\n..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"brainstorm_artifact"` |
| `filename` | string | The filename of the artifact |
| `content` | string | The markdown content |

### Brainstorm Image Message

```json
{
  "type": "brainstorm_image",
  "filename": "creative_workspace.png",
  "label": "Creative Workspace",
  "data": "base64_encoded_image_data..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"brainstorm_image"` |
| `filename` | string | The filename of the image |
| `label` | string | Short label describing the image |
| `data` | string | Base64-encoded PNG image data |

### Brainstorm Video Message

```json
{
  "type": "brainstorm_video",
  "filename": "idea_transformation.mp4",
  "label": "Idea Transformation",
  "data": "base64_encoded_video_data..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Must be `"brainstorm_video"` |
| `filename` | string | The filename of the video |
| `label` | string | Short label describing the video |
| `data` | string | Base64-encoded MP4 video data |

### Interrupted Message

```json
{
  "type": "interrupted"
}
```

### Session Resumption Update Message

```json
{
  "type": "session_resumption_update",
  "handle": "session_handle_for_resumption"
}
```

### Error Message

```json
{
  "type": "error",
  "content": "Error message description"
}
```

## Flash Model Options

The following Flash text models can be selected for workers:

| Model Key | Description |
|-----------|-------------|
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite Preview |
| `gemini-3-flash` | Gemini 3 Flash Latest |
| `gemini-3.1-pro` | Gemini 3.1 Pro Preview |

## Connection Handling

1. **Connection**: Client connects to WebSocket
2. **Session Configuration**: Client can send `session_config` to customize:
   - Session resumption handle
   - Flash model selection
   - Enabled tools
3. **Session Loop**: Server runs session with retry logic
4. **Tool Execution**: Tools run asynchronously in background via FlashWorker
5. **Cleanup**: On disconnect, receive task is cancelled and WebSocket closed

## Audio Format

- **Input**: PCM16 at 16kHz (resampled from microphone)
- **Output**: PCM16 at 24kHz

## Source Code

- Endpoint: `src/app/api/v1/endpoints/brainstorm.py`
- Service: `src/app/services/gemini_audio.py`
- Worker: `src/app/services/flash_worker.py`
- Tool Definitions: `src/app/services/tool_defs.py`
- Manager: `src/app/services/ws_manager.py`
