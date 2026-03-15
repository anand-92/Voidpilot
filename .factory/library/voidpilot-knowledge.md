# Voidpilot Knowledge Base

## Product Snapshot

- **Name**: Voidpilot
- **Primary mission focus here**: the landing-page `Talk to Voidpilot` walkthrough experience
- **Current walkthrough promise**: a no-sign-in voice/text guide that answers questions about the Voidpilot project itself

## Relevant Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.12+ |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| Realtime session | Gemini Live via backend relay |
| Project grounding helper | Separate Gemini `generate_content` call with File Search |
| Routing | HashRouter with landing page at `/` |

## Walkthrough Architecture Facts

- Frontend walkthrough traffic goes to the app backend websocket at `/api/v1/live/walkthrough`.
- The walkthrough backend uses `GeminiLive` with audio input/output transcription enabled.
- The walkthrough exposes one tool: `search_project_context`.
- `search_project_context` uses a separate Gemini request backed by the configured File Search store.
- The walkthrough should be described as a backend-mediated Gemini Live session with helper-model grounding, not as native Gemini Live File Search.

## Current Walkthrough Models

| Model | Purpose |
|-------|---------|
| `gemini-2.5-flash-native-audio-preview-12-2025` | Realtime walkthrough voice session |
| `gemini-flash-latest` | Helper model used by `search_project_context` with File Search |

## Relevant Event Shapes

- Transcript turns are forwarded to the client as websocket `text` events.
- Tool activity can surface as `tool_call_start` and `tool_call` events.
- Session/control events can include `interrupted`, `go_away`, `session_resumption_update`, and `error`.

## Accuracy Traps To Avoid

- Do not say the browser connects directly to Gemini Live for this feature.
- Do not say Gemini Live natively searches the File Search store.
- Do not imply direct repo scanning, raw file reads, or current-working-tree access from the walkthrough explainer.
- Keep walkthrough explanations scoped to the walkthrough itself; do not drift into brainstorm/platform marketing copy.

## Implementation Reminder

- The Google GenAI SDK response objects are object-based, not dict-based; use attributes/getattr-style access rather than `.get()` assumptions when touching backend response handling.

