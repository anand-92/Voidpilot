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

## UX Decisions

- **Activation**: Brainstorm Mode lives on its own route (`/#/brainstorm`) with a dedicated layout — separate from the main assistant view at `/#/app`.
- **Artifact updates**: Flash Lite always **rewrites the full document** on each save. Simpler, and Flash Lite sees the full picture each time. The `mode` param on the tool is kept for future incremental support but MVP always does a full rewrite.
- **Web preview**: Full inline preview from day one — rendered markdown via `react-markdown` and displayed images in the workspace panel. Not just a file list.
- **System prompt**: Brainstorm mode **completely replaces** the assistant prompt. No weather, bash, or midscene tools — it's a focused brainstorming experience with only the brainstorm tool set.

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
| **Session resumption** | Must be added to brainstorm endpoint's `LiveConnectConfig` — not yet configured in the codebase. Needed to bridge WebSocket reconnections during long brainstorm sessions. |
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

Gemini Live calls this to create or update the brainstorm markdown. The backend delegates the actual structured markdown generation to **Flash Lite**, which produces clean, well-organized content from the raw ideas Gemini Live passes along. **Flash Lite always rewrites the full document** — simpler, and it sees the whole picture each time.

```json
{
  "name": "save_brainstorm_artifact",
  "behavior": "NON_BLOCKING",
  "description": "Create or update the brainstorm markdown document. A background worker (Flash Lite) will structure and format the content into a complete document. The conversation continues uninterrupted.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Title of the brainstorm session"
      },
      "raw_ideas": {
        "type": "string",
        "description": "ALL ideas, themes, and decisions from the conversation so far. Flash Lite will structure the complete set into a clean markdown document, replacing any previous version."
      },
      "filename": {
        "type": "string",
        "description": "Filename for the artifact (e.g. brainstorm-app-redesign.md)"
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

    async def generate_markdown(self, title: str, raw_ideas: str) -> str:
        """Structure raw brainstorm ideas into clean markdown (full rewrite)."""
        prompt = f"""You are a brainstorm document writer.
Title: {title}

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

async def handle_brainstorm_save(title: str, raw_ideas: str, filename: str) -> dict:
    """NON_BLOCKING handler — Flash Lite structures the markdown (full rewrite each time)."""
    flash = FlashWorker(api_key)

    # Flash Lite rewrites the full document from scratch
    markdown = await flash.generate_markdown(title, raw_ideas)

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
    """NON_BLOCKING handler — Flash Lite does the thinking and creates an artifact."""
    flash = FlashWorker(api_key)
    result = await flash.delegate_task(task, context, output_format)

    # Delegation results become artifacts too — Gemini Live is just the bridge
    filename = f"analysis-{task[:30].replace(' ', '-').lower()}.md"
    await store_artifact(session_id, filename, result, platform)

    await websocket.send_json({
        "type": "brainstorm_artifact",
        "filename": filename,
        "content": result,
    })

    return {
        "result": result,
        "scheduling": "WHEN_IDLE",  # Share the analysis when Gemini has a moment
    }
```

### 5. Platform-Aware Artifact Routing

```
Client connects to /api/v1/live/brainstorm → backend creates GeminiLive with brainstorm system prompt + tools
Client sends { type: "platform_info", platform: "electron" | "web", outputDir?: string }

Tool response arrives from Flash Lite worker → backend:
  → push artifact payload to frontend via WebSocket (always)
  if platform == "electron":
    → frontend writes to local filesystem via Electron IPC
    → file appears in user's chosen folder immediately
  if platform == "web":
    → frontend holds artifact in React state for virtual workspace display
    → all downloads (single + zip) happen client-side
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

#### Web Path (Virtual Workspace) — Detailed Walkthrough

Web users don't have a filesystem. The backend holds artifacts in-memory for the WebSocket session lifetime, pushes them to the frontend in real-time, and the frontend handles downloads client-side.

**Step-by-step lifecycle:**

```
1. USER connects via WebSocket to /api/v1/live/ws
   └─ Backend generates a session_id (uuid4)
   └─ Creates session-scoped artifact store: artifact_store = {}

2. USER talks → Gemini Live fires NON_BLOCKING tool call:
   save_brainstorm_artifact(title="App Ideas", raw_ideas="...", filename="brainstorm.md")

3. BACKEND receives tool call, spawns async Flash Lite worker:
   └─ Flash Lite (gemini-3.1-flash-lite-preview) structures raw ideas → clean markdown
   └─ Returns in ~1-2 seconds

4. BACKEND stores artifact in-memory:
   artifact_store["brainstorm.md"] = {
       "content": "# App Ideas\n\n## Key Themes\n...",
       "mime_type": "text/markdown",
       "size": 2847,
       "updated_at": "2026-03-09T14:32:01Z",
   }

5. BACKEND pushes to frontend over the existing WebSocket:
   {
       "type": "brainstorm_artifact",
       "filename": "brainstorm.md",
       "content": "# App Ideas\n\n## Key Themes\n...",
       "mime_type": "text/markdown"
   }

6. FRONTEND receives event → updates React state → artifact appears in workspace:
   └─ Markdown rendered inline via react-markdown
   └─ If file already exists in state, panel live-refreshes with new content

7. USER downloads:
   a) Single file → entirely CLIENT-SIDE (content is already in React state):
      └─ Create Blob from state → trigger <a download> click → no server round-trip
   b) "Download All" → entirely CLIENT-SIDE using JSZip:
      └─ Zip all artifacts from React state → trigger download → no server round-trip
```

**Single-file download (client-side, zero server calls):**

```typescript
function downloadArtifact(filename: string, content: string | Uint8Array, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Image artifacts over WebSocket (base64):**

```python
# Backend pushes image as base64
await websocket.send_json({
    "type": "brainstorm_image",
    "filename": "concept-sketch.png",
    "label": "concept sketch",
    "data": base64.b64encode(image_bytes).decode(),
    "mime_type": "image/png",
})
```

```tsx
// Frontend displays inline
<img src={`data:image/png;base64,${artifact.data}`} alt={artifact.label} />
```

**Memory management (no server-side storage needed):**

```python
# Artifacts are pushed to the frontend over WebSocket as they're generated.
# The frontend holds all artifacts in React state.
# All downloads (single file + zip) happen entirely client-side.
# No module-level artifact_store needed — avoids Cloud Run multi-instance issues.
async def gemini_live_brainstorm_ws(websocket: WebSocket):
    session_id = str(uuid.uuid4())
    # ... session logic ...
    # Artifacts are sent to frontend via websocket.send_json() as they arrive
    # from Flash Lite workers. Frontend React state is the single source of truth.
```

**"Download All" (client-side with JSZip — no server endpoint):**

Since Cloud Run can run multiple instances, a server-side zip endpoint would fail if the HTTP request routes to a different instance than the one holding the WebSocket session's artifacts. Instead, the frontend already has all artifact content in React state, so we zip entirely client-side:

```typescript
import JSZip from 'jszip';

async function downloadAllArtifacts(artifacts: Map<string, { content: string | Uint8Array; mimeType: string }>, sessionLabel: string) {
  const zip = new JSZip();
  for (const [filename, artifact] of artifacts) {
    zip.file(filename, artifact.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brainstorm-${sessionLabel}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

> **Note:** This eliminates the need for a server-side zip endpoint and the module-level `artifact_store` dict. The backend only needs to push artifacts over WebSocket — no REST endpoints for download.

### 7. Routing & Endpoint

Brainstorm Mode gets its own route in `main.tsx` and its own WebSocket endpoint:

**Frontend routes** (note: currently `main.tsx` only has `/#/` → LandingPage in web mode, no `/#/app` exists yet):

```
/#/            → LandingPage (existing)
/#/brainstorm  → BrainstormPage (new — dedicated brainstorm layout)
```

**Backend WebSocket endpoint:**

Brainstorm Mode uses a **separate WebSocket endpoint** (`/api/v1/live/brainstorm`) rather than sharing `/api/v1/live/ws`. This is cleaner than a `brainstorm_init` message because the current backend creates the `GeminiLive` instance (with system prompt and tools) before reading any client messages — a dynamic switch isn't possible without restructuring the handler. A dedicated endpoint keeps both code paths clean.

```
/api/v1/live/ws          → existing assistant mode (weather, midscene, bash tools)
/api/v1/live/brainstorm  → brainstorm mode (save_brainstorm_artifact, generate_brainstorm_image, delegate_to_flash)
```

The `BrainstormPage` component has its own layout optimized for brainstorming:
- No screen sharing controls, no display picker, no Midscene settings
- Voice controls (mic, connect/disconnect) on the left or top
- Conversation transcript in the center
- Artifact workspace panel on the right (full inline preview)

### 8. Frontend — UI Components

#### Electron: Artifact Sidebar

The `BrainstormPage` layout in Electron includes:

- Folder picker (where to save artifacts — uses Electron `dialog.showOpenDialog`)
- Live list of generated files with open-in-finder buttons
- Inline markdown preview of the current brainstorm document
- Status indicators showing when Flash Lite workers are active
- **"Save snapshot" button** — sends a system-level text message to Gemini (e.g., `"[SYSTEM: User requested a brainstorm save. Call save_brainstorm_artifact now with all current ideas.]"`) as a manual save trigger, complementing Gemini's autonomous saves
- No screen sharing / Midscene controls — focused brainstorm experience

#### Web: Virtual Workspace Panel

The `BrainstormPage` layout in web mode includes a right-side workspace panel with full inline preview:

- File tree of all session artifacts (updates in real-time as artifacts arrive over WebSocket)
- Markdown rendered inline via `react-markdown` (new dependency — must be added to `package.json`) for `.md` files
- Images displayed inline via base64 data URIs
- Individual download buttons per file (client-side, no server call)
- "Download All (.zip)" button (client-side using JSZip — no server endpoint needed, avoids Cloud Run multi-instance routing issues)
- **"Save snapshot" button** — manual trigger for Gemini to save current brainstorm state
- File count and total size indicator
- Warning banner: "Artifacts are stored in your session. Download before disconnecting."

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
| **Session Resumption** | Must be added to brainstorm endpoint's `LiveConnectConfig` — enables "continue where we left off" across WebSocket reconnections |

---

## Implementation Plan

### Phase 1: MVP — Async Markdown Artifacts

1. Build `FlashWorker` service class wrapping `gemini-3.1-flash-lite-preview`
2. Add `save_brainstorm_artifact` tool declaration with `"behavior": "NON_BLOCKING"`
3. Implement backend tool handler with Flash Lite delegation + `scheduling: "SILENT"`
4. Create **separate WebSocket endpoint** at `/api/v1/live/brainstorm` with brainstorm-specific system prompt and tools
5. Add `session_resumption` to brainstorm endpoint's `LiveConnectConfig` (not yet configured in codebase)
6. Wire up platform-aware artifact routing (Electron IPC + Web in-memory → WebSocket push)
7. Add dedicated brainstorm system prompt (replaces default assistant prompt entirely)
8. Create `/#/brainstorm` route with `BrainstormPage` component (note: `/#/app` doesn't exist yet in web mode — only `/#/` → LandingPage)
9. Install `react-markdown` and `jszip` as new frontend dependencies
10. Build workspace panel with inline markdown preview + client-side download (single + zip via JSZip)
11. Add **"Save snapshot" button** — sends system-level text to Gemini as manual save trigger
12. Electron: add `write-brainstorm-file` IPC handler + folder picker UI

### Phase 2: Image Artifacts + Delegation

1. Add `generate_brainstorm_image` tool with `NON_BLOCKING` + `scheduling: "WHEN_IDLE"`
2. Add `delegate_to_flash` general-purpose tool — results are saved as artifacts in the workspace (Gemini Live is just the voice bridge; Flash Lite produces all artifacts)
3. Flash Lite image worker using `gemini-3.1-flash-image-preview` (Nano Banana 2)
4. Render images inline in both artifact views
5. Show Flash Lite worker activity status in the UI

### Phase 3: Polish

1. Brainstorm session list — view past brainstorms (Electron: scan folder; Web: session history)
2. Session resumption — load previous artifact as context for a new session
3. Export to PDF option
4. Google Search grounding — let Gemini research mid-brainstorm via `delegate_to_flash`

---

## Key Technical Constraints

- **Live API does not generate images** — audio models output audio+text only. Image gen must go through Flash Lite calling `gemini-3.1-flash-image-preview` (Nano Banana 2).
- **NON_BLOCKING is essential** — without it, every tool call freezes the voice conversation. All brainstorm tools must use this behavior.
- **Flash Lite latency** — markdown generation is fast (~1-2s). Image generation is slower (~3-6s). UI should show a spinner in the artifact panel.
- **Scheduling choice matters** — `SILENT` for routine saves prevents Gemini from awkwardly announcing "I've saved the file" every few minutes. `WHEN_IDLE` for images lets Gemini naturally mention "I've created a visual for that idea" at a conversational pause.
- **Session duration** — with context window compression, sessions run long, but WebSocket connections are limited to ~10 minutes. Session resumption (must be added to brainstorm endpoint's `LiveConnectConfig`) bridges reconnections.
- **Audio + function calling reliability** — the docs note audio I/O negatively impacts function calling accuracy. The two-model split helps: Live makes simple, lightweight tool calls; Flash Lite does the complex reasoning. A manual "Save snapshot" button in the UI serves as a fallback when Gemini doesn't autonomously trigger saves.
- **Web artifact memory** — artifacts are pushed to the frontend over WebSocket and held in React state. All downloads (single and zip) happen client-side. No server-side artifact storage needed — this avoids Cloud Run multi-instance routing issues where an HTTP request might hit a different instance than the one holding the WebSocket session.
- **New frontend dependencies** — `react-markdown` for inline preview, `jszip` for client-side zip downloads. Neither exists in `package.json` today.

---

## Hackathon Category Fit

This feature fits the **Live Agent** category:

> "Build an agent that users can talk to naturally and can be interrupted."

**Scoring alignment:**

- **Innovation & Multimodal UX (40%)**: Voice-driven brainstorm with real-time artifact generation that **never interrupts the conversation**. The async two-model architecture is a novel pattern. Dual-mode (desktop local files + web virtual workspace) shows platform awareness.
- **Technical Implementation (30%)**: Live API + NON_BLOCKING tool calling + Flash Lite worker pool + image generation + structured output + context compression + Electron IPC — deep integration across multiple Google APIs and platform layers.
- **Demo & Presentation (30%)**: Highly demo-friendly. User talks about an idea, the conversation flows naturally, and artifacts silently materialize in the background. Desktop demo shows files appearing in Finder mid-conversation. Web demo shows the virtual workspace filling up. The "never blocks" behavior is the wow factor.
