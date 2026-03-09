# Brainstorm Mode

**Voice-driven ideation with Voidpilot as your second brain.**

Users speak naturally to Voidpilot about their ideas, and Voidpilot actively participates — challenging assumptions, building on ideas, and producing **artifacts** (markdown files, images, diagrams) that capture the session in real time.

---

## Core Concept

Brainstorm Mode transforms Voidpilot from a reactive assistant into a **creative collaborator**. The user talks through ideas while Voidpilot:

1. **Listens and synthesizes** — tracks threads, themes, and decisions across the conversation
2. **Contributes insights** — offers counter-arguments, connects dots, suggests angles the user hasn't considered
3. **Produces artifacts** — generates structured markdown documents, concept images, and diagrams that persist after the session ends

The primary artifact is always a **markdown file** — a living brainstorm document that Voidpilot updates as the conversation evolves. Supporting artifacts (images, diagrams) are embedded or linked within it.

---

## Two-Model Architecture: Live + Flash Lite Workers

The key architectural insight: **Gemini Live should never block on artifact work.** The Live model's job is to stay fully engaged with the user in real-time voice conversation. All heavy lifting (writing markdown, generating images, structuring data) is delegated to **Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite-preview`) workers that run in the background.

```
┌─────────────────────────────────────────────────────┐
│                    User (voice)                      │
│                        │                             │
│                        ▼                             │
│  ┌─────────────────────────────────┐                │
│  │     Gemini Live (native audio)  │                │
│  │     - Real-time conversation    │                │
│  │     - Session memory            │                │
│  │     - NON_BLOCKING tool calls   │◄──── keeps     │
│  │     - Barge-in support          │      talking    │
│  └──────┬──────────┬───────────────┘                │
│         │          │                                 │
│    tool call   tool call        (async, non-blocking)│
│         │          │                                 │
│         ▼          ▼                                 │
│  ┌───────────┐ ┌────────────────────┐                │
│  │ Flash Lite│ │  Flash Image       │                │
│  │ 3.1       │ │  3.1 (Nano Banana) │                │
│  │ (markdown)│ │  (image gen)       │                │
│  └─────┬─────┘ └──────┬─────────────┘                │
│        │               │                             │
│        ▼               ▼                             │
│   brainstorm.md   concept.png                        │
│        │               │                             │
│        └───────┬───────┘                             │
│                ▼                                     │
│   ┌─────────────────────┐                           │
│   │  Artifact Storage   │                           │
│   │  Electron: local fs │                           │
│   │  Web: virtual ws    │                           │
│   └─────────────────────┘                           │
└─────────────────────────────────────────────────────┘
```

### Why This Matters

| Concern | Solution |
|---------|---------|
| Live model blocks while writing artifacts | `NON_BLOCKING` behavior — Live keeps talking |
| Artifact generation is slow (especially images) | Flash Lite handles it in parallel; results arrive via `scheduling` |
| Live model's function calling is less reliable with audio | Fewer, simpler tool calls from Live; Flash Lite does the complex work |
| Cost | Flash Lite is cheaper and faster for structured text/image generation |

### Async Tool Calling (NON_BLOCKING)

The Gemini Live API supports **asynchronous function calling** via the `NON_BLOCKING` behavior flag. This is what makes the whole architecture work:

**Default (blocking):** Gemini pauses conversation, waits for tool response, then continues.

**With `"behavior": "NON_BLOCKING"`:** Gemini fires the tool call and **immediately continues talking** to the user. When the tool response arrives, the `scheduling` parameter controls what happens:

| Scheduling | Behavior | Use Case |
|---|---|---|
| `INTERRUPT` | Gemini stops talking and addresses the result immediately | Critical errors, user-requested status |
| `WHEN_IDLE` | Gemini finishes current thought, then mentions the result | "Your brainstorm doc has been updated" |
| `SILENT` | Gemini absorbs the result without telling the user | Background saves, incremental updates |

For brainstorm artifacts, we use:
- **`SILENT`** for routine saves — the markdown just updates in the background
- **`WHEN_IDLE`** for image generation — Gemini mentions "I've created a concept image for that" after finishing its current thought
- **`INTERRUPT`** only for errors — "I wasn't able to save that, let me try again"

---

## Dual-Mode Artifact Storage

Brainstorm Mode works in **both** deployment targets with platform-appropriate artifact handling:

| | Electron (Desktop) | Web (Cloud Run) |
|---|---|---|
| **Artifact storage** | Written directly to the local filesystem via Electron IPC | Held in-memory on the backend, served to a virtual workspace UI |
| **File access** | User chooses a folder; files appear in Finder/Explorer instantly | Virtual workspace panel shows all artifacts; download individually or as .zip |
| **Image generation** | Saved as local `.png` files alongside the markdown | Served as base64 or temporary URLs in the workspace |
| **Session persistence** | Files persist on disk after session ends | Artifacts live for the session duration; user must download to keep them |
| **Midscene integration** | Available — Voidpilot can see screen context while brainstorming | N/A — web mode is audio-only |

---

## How It Works (Technical Design)

### 1. Gemini Live API — The Voice Layer

Brainstorm Mode runs on the same Gemini Live API WebSocket session the app already uses (`/api/v1/live/ws`). Key capabilities we leverage:

| Capability | How We Use It |
|-----------|--------------|
| **Real-time voice** | User speaks freely; Voidpilot responds with voice while artifacts generate in the background |
| **Session memory** | Gemini retains full conversation context (up to 128k tokens with compression) |
| **Audio transcription** | Both input and output transcriptions already enabled — feeds artifact content |
| **Barge-in / interruption** | User can redirect the brainstorm at any time ("wait, go back to that first idea") |
| **Affective dialog** | Voidpilot adapts tone — encouraging when unsure, challenging when confident |
| **Context window compression** | Already configured (trigger at 25.6k, slide to 12.8k) — enables long brainstorm sessions |
| **NON_BLOCKING function calling** | Artifact tools run asynchronously — Live model never pauses the conversation |

**System prompt for Brainstorm Mode:**

```
You are Voidpilot in Brainstorm Mode — a creative thinking partner.
Your job is to help the user develop and refine their ideas.

Behavior:
- Ask probing questions to deepen ideas
- Offer alternative perspectives and "what if" scenarios
- Identify connections between ideas the user might miss
- Challenge weak assumptions constructively
- Summarize progress periodically

Artifact generation:
- Your tools run in the background — do NOT pause the conversation to wait for them.
- Call save_brainstorm_artifact when ideas crystallize into structured content.
- Call generate_brainstorm_image when a visual would help the brainstorm.
- Call delegate_to_flash when you need analysis, research synthesis, or structured data extraction.
- Keep talking to the user while tools execute. You'll be notified when they complete.
```

### 2. Tool Declarations — All NON_BLOCKING

All brainstorm tools use `"behavior": "NON_BLOCKING"` so the Live model never stalls.

#### Tool: `save_brainstorm_artifact`

Gemini Live calls this to create or update the brainstorm markdown. The backend delegates the actual structured markdown generation to **Flash Lite**, which produces clean, well-organized content from the raw ideas Gemini Live passes along.

```json
{
  "name": "save_brainstorm_artifact",
  "behavior": "NON_BLOCKING",
  "description": "Create or update the brainstorm markdown document. A background worker (Flash Lite) will structure and format the content. The conversation continues uninterrupted.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Title of the brainstorm session"
      },
      "raw_ideas": {
        "type": "string",
        "description": "Raw ideas, themes, and decisions from the conversation so far. Flash Lite will structure this into a clean markdown document."
      },
      "filename": {
        "type": "string",
        "description": "Filename for the artifact (e.g. brainstorm-app-redesign.md)"
      },
      "mode": {
        "type": "string",
        "enum": ["create", "append", "rewrite"],
        "description": "create = new file, append = add a new section, rewrite = regenerate the full document"
      }
    },
    "required": ["title", "raw_ideas", "filename"]
  }
}
```

#### Tool: `generate_brainstorm_image`

Gemini Live calls this to create a supporting visual. The backend delegates to **Flash Lite** (image-capable variant) for generation.

```json
{
  "name": "generate_brainstorm_image",
  "behavior": "NON_BLOCKING",
  "description": "Generate a visual artifact for the brainstorm — concept sketches, diagrams, or mood images. Runs in the background via Flash Lite image generation.",
  "parameters": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Detailed description of the image to generate"
      },
      "label": {
        "type": "string",
        "description": "Short label used as filename and alt text"
      }
    },
    "required": ["prompt", "label"]
  }
}
```

#### Tool: `delegate_to_flash`

A general-purpose delegation tool. Gemini Live can offload any heavy thinking to Flash Lite — research synthesis, pro/con analysis, structured data extraction, etc.

```json
{
  "name": "delegate_to_flash",
  "behavior": "NON_BLOCKING",
  "description": "Delegate a thinking task to Flash Lite. Use for analysis, research synthesis, structured comparisons, or any task that benefits from deeper processing without interrupting the conversation.",
  "parameters": {
    "type": "object",
    "properties": {
      "task": {
        "type": "string",
        "description": "What Flash Lite should do (e.g. 'Create a pros/cons table for approaches A vs B vs C')"
      },
      "context": {
        "type": "string",
        "description": "Relevant context from the brainstorm so far"
      },
      "output_format": {
        "type": "string",
        "enum": ["markdown_section", "json", "summary"],
        "description": "How to format the result"
      }
    },
    "required": ["task", "context"]
  }
}
```

### 3. Backend — Flash Lite Worker Pool

The backend runs a pool of Flash Lite workers that handle delegated tasks. These are standard `generateContent` calls — fast, cheap, and parallelizable.

```python
# services/flash_worker.py

from google import genai
from google.genai import types

class FlashWorker:
    """Lightweight worker using Gemini 3.1 Flash Lite for background tasks."""

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3.1-flash-lite-preview"
        self.image_model = "gemini-3.1-flash-image-preview"

    async def generate_markdown(self, title: str, raw_ideas: str, mode: str, existing_content: str = "") -> str:
        """Structure raw brainstorm ideas into clean markdown."""
        prompt = f"""You are a brainstorm document writer.
Title: {title}
Mode: {mode}
{"Existing document:\n" + existing_content if existing_content else ""}

Raw ideas from the brainstorm session:
{raw_ideas}

Generate a well-structured markdown document. Use headers, bullet points,
and clear sections. Preserve all ideas but organize them logically."""

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return response.text

    async def generate_image(self, prompt: str) -> bytes:
        """Generate an image using Flash image model."""
        response = await self.client.aio.models.generate_content(
            model=self.image_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=[types.Modality.TEXT, types.Modality.IMAGE],
            ),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data:
                return part.inline_data.data
        raise ValueError("No image generated")

    async def delegate_task(self, task: str, context: str, output_format: str = "markdown_section") -> str:
        """Run a general-purpose thinking task."""
        prompt = f"""Task: {task}

Context from the brainstorm:
{context}

Output format: {output_format}"""

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        return response.text
```

### 4. Tool Handler Flow (with scheduling)

When Gemini Live makes a `NON_BLOCKING` tool call, the backend:

1. Immediately returns control to the Live session (Gemini keeps talking)
2. Spawns the Flash Lite worker as an async task
3. When the worker finishes, sends the `FunctionResponse` with the appropriate `scheduling`
4. Simultaneously pushes the artifact to the frontend via WebSocket

```python
# In live.py tool handler

async def handle_brainstorm_save(title: str, raw_ideas: str, filename: str, mode: str = "create") -> dict:
    """NON_BLOCKING handler — Flash Lite structures the markdown."""
    flash = FlashWorker(api_key)

    # Get existing content if appending/rewriting
    existing = artifact_store.get(session_id, filename, "")

    # Flash Lite does the heavy lifting
    markdown = await flash.generate_markdown(title, raw_ideas, mode, existing)

    # Store the artifact (platform-aware)
    await store_artifact(session_id, filename, markdown, platform)

    # Push to frontend
    await websocket.send_json({
        "type": "brainstorm_artifact",
        "filename": filename,
        "content": markdown,
        "action": mode,
    })

    return {
        "result": f"Saved {filename} ({len(markdown)} chars)",
        "scheduling": "SILENT",  # Don't interrupt the conversation
    }

async def handle_brainstorm_image(prompt: str, label: str) -> dict:
    """NON_BLOCKING handler — Flash Lite generates the image."""
    flash = FlashWorker(api_key)
    image_data = await flash.generate_image(prompt)
    filename = f"{label.replace(' ', '-').lower()}.png"

    await store_artifact(session_id, filename, image_data, platform)

    await websocket.send_json({
        "type": "brainstorm_image",
        "filename": filename,
        "label": label,
        "data": base64.b64encode(image_data).decode(),
    })

    return {
        "result": f"Generated image: {filename}",
        "scheduling": "WHEN_IDLE",  # Mention it when there's a natural pause
    }

async def handle_delegate(task: str, context: str, output_format: str = "markdown_section") -> dict:
    """NON_BLOCKING handler — Flash Lite does the thinking."""
    flash = FlashWorker(api_key)
    result = await flash.delegate_task(task, context, output_format)

    return {
        "result": result,
        "scheduling": "WHEN_IDLE",  # Share the analysis when Gemini has a moment
    }
```

### 5. Platform-Aware Artifact Routing

```
Client connects → sends { type: "brainstorm_init", platform: "electron" | "web", outputDir?: string }

Tool response arrives from Flash Lite worker → backend:
  if platform == "electron":
    → send artifact payload to frontend via WebSocket
    → frontend writes to local filesystem via Electron IPC
    → file appears in user's chosen folder immediately
  if platform == "web":
    → store artifact in session-scoped in-memory dict
    → push artifact event to frontend for virtual workspace display
```

#### Electron Path (Local Filesystem)

New IPC handler in `main.ts`:

```typescript
ipcMain.handle('write-brainstorm-file', async (_, args: { dir: string, filename: string, content: string | Buffer }) => {
  const filePath = join(args.dir, args.filename)
  await fs.promises.mkdir(dirname(filePath), { recursive: true })
  await fs.promises.writeFile(filePath, args.content)
  return filePath
})
```

New preload exposure:

```typescript
writeBrainstormFile: (args: { dir: string; filename: string; content: string | Buffer }) =>
  ipcRenderer.invoke('write-brainstorm-file', args)
```

#### Web Path (Virtual Workspace)

```
Download endpoints:
  GET /api/v1/brainstorm/{session_id}/files/{filename}  → single file
  GET /api/v1/brainstorm/{session_id}/download           → zip of all artifacts
```

### 6. Frontend — UI Components

#### Electron: Artifact Sidebar

Extends the existing left panel in `App.tsx`:

- Folder picker (where to save artifacts)
- Live list of generated files with open-in-finder buttons
- Inline markdown preview of the current brainstorm document
- Toggle to enter/exit Brainstorm Mode
- Status indicators showing when Flash Lite workers are active

#### Web: Virtual Workspace Panel

Right-side panel:

- File tree of all session artifacts
- Markdown renderer for `.md` files (using `react-markdown`)
- Image viewer for generated `.png` files
- Individual download buttons per file
- "Download All (.zip)" button
- File count and total size indicator

```
+----------------------------------+-------------------+
|                                  |                   |
|    Voice conversation            |  Artifact Panel   |
|    (existing chat UI)            |                   |
|                                  |  brainstorm.md  ↗ |
|    [mic] [disconnect]            |  concept-v1.png ↗ |
|                                  |  analysis.md   ↗ |
|    User: "what if we..."         |                   |
|    Voidpilot: "that's..."        |  ⚡ Flash Lite    |
|                                  |  generating...    |
|                                  |                   |
|                                  |  [Download All]   |
+----------------------------------+-------------------+
```

---

## Grounding in Google APIs

| API / Service | Role in Brainstorm Mode |
|--------------|------------------------|
| **Gemini Live API** (native audio) | Voice conversation, session memory, NON_BLOCKING tool orchestration |
| **Gemini 3.1 Flash Lite** (`gemini-3.1-flash-lite-preview`) | Background worker for markdown structuring, analysis, structured data extraction |
| **Gemini 3.1 Flash Image** aka Nano Banana 2 (`gemini-3.1-flash-image-preview`) | Visual artifacts — concept sketches, diagrams, mood images |
| **Structured Output** | Flash Lite uses `response_json_schema` for structured brainstorm data (ideas list, decision matrix) |
| **Google Search (grounding)** | Available as a Live API tool for mid-brainstorm fact-checking |
| **Audio Transcription** | Already enabled — provides raw transcript that feeds artifact generation |
| **Context Window Compression** | Already configured — enables brainstorm sessions longer than 15 minutes |
| **Session Resumption** | `session_resumption_config` — enables "continue where we left off" |

---

## Implementation Plan

### Phase 1: MVP — Async Markdown Artifacts

1. Build `FlashWorker` service class wrapping `gemini-3.1-flash-lite-preview`
2. Add `save_brainstorm_artifact` tool declaration with `"behavior": "NON_BLOCKING"`
3. Implement backend tool handler with Flash Lite delegation + `scheduling: "SILENT"`
4. Wire up platform-aware artifact routing (Electron IPC + Web in-memory store)
5. Add brainstorm system prompt (switchable via UI toggle)
6. Build artifact sidebar (Electron) and virtual workspace panel (Web)
7. Add folder picker UI for Electron, download buttons for Web

### Phase 2: Image Artifacts + Delegation

1. Add `generate_brainstorm_image` tool with `NON_BLOCKING` + `scheduling: "WHEN_IDLE"`
2. Add `delegate_to_flash` general-purpose tool for analysis/synthesis tasks
3. Flash Lite image worker using `gemini-3.1-flash-image-preview` (Nano Banana 2)
4. Render images inline in both artifact views
5. Show Flash Lite worker activity status in the UI

### Phase 3: Polish

1. Brainstorm session list — view past brainstorms (Electron: scan folder; Web: session history)
2. Session resumption — load previous artifact as context for a new session
3. "Download All as .zip" for web mode
4. Export to PDF option
5. Google Search grounding — let Gemini research mid-brainstorm via `delegate_to_flash`

---

## Key Technical Constraints

- **Live API does not generate images** — audio models output audio+text only. Image gen must go through Flash Lite calling `gemini-3.1-flash-image-preview` (Nano Banana 2).
- **NON_BLOCKING is essential** — without it, every tool call freezes the voice conversation. All brainstorm tools must use this behavior.
- **Flash Lite latency** — markdown generation is fast (~1-2s). Image generation is slower (~3-6s). UI should show a spinner in the artifact panel.
- **Scheduling choice matters** — `SILENT` for routine saves prevents Gemini from awkwardly announcing "I've saved the file" every few minutes. `WHEN_IDLE` for images lets Gemini naturally mention "I've created a visual for that idea" at a conversational pause.
- **Session duration** — with context window compression, sessions run long, but WebSocket connections are limited to ~10 minutes. Session resumption bridges reconnections.
- **Audio + function calling reliability** — the docs note audio I/O negatively impacts function calling accuracy. The two-model split helps: Live makes simple, lightweight tool calls; Flash Lite does the complex reasoning.
- **Web artifact memory** — in-memory storage means artifacts are lost if the server restarts. Acceptable for MVP; Phase 3 could add Cloud Storage.

---

## Hackathon Category Fit

This feature fits the **Live Agent** category:

> "Build an agent that users can talk to naturally and can be interrupted."

**Scoring alignment:**

- **Innovation & Multimodal UX (40%)**: Voice-driven brainstorm with real-time artifact generation that **never interrupts the conversation**. The async two-model architecture is a novel pattern. Dual-mode (desktop local files + web virtual workspace) shows platform awareness.
- **Technical Implementation (30%)**: Live API + NON_BLOCKING tool calling + Flash Lite worker pool + image generation + structured output + context compression + Electron IPC — deep integration across multiple Google APIs and platform layers.
- **Demo & Presentation (30%)**: Highly demo-friendly. User talks about an idea, the conversation flows naturally, and artifacts silently materialize in the background. Desktop demo shows files appearing in Finder mid-conversation. Web demo shows the virtual workspace filling up. The "never blocks" behavior is the wow factor.
