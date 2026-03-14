# Architecture

Use this file for worker-facing architectural guidance for the brainstorm auth/persistence mission.

## Mission Architecture

- Brainstorm auth and persistence are scoped to brainstorm only.
- Frontend owns Firebase Auth UI and auth state.
- FastAPI owns persistence and access control.
- Persisted brainstorm data should be written by backend services, not directly from the browser to Firestore.

## Session Model

- Brainstorm sessions have immutable mode semantics for their lifetime:
  - `guest`
  - `persisted`
- Guest sessions stay ephemeral and must never be upgraded into persisted sessions mid-stream.
- Signed-in users enter brainstorm through a library-first modal flow.

## Persistence Shape

- Firestore stores brainstorm session metadata, saved transcript/turn state, share metadata, and library-facing data.
- Cloud Storage stores persisted artifact bytes for markdown/images/videos.
- Backend must preserve coherence between transcript state, artifact metadata, and stored artifact files.
- Delayed tool/artifact completions must still be written back to the originating session.

## Sharing Model

- Only persisted signed-in sessions can be shared.
- Public share pages are read-only and must not start live brainstorm websocket/audio sessions.
- Public share links always reflect the latest persisted session state.
- Deleting a session must invalidate the share page and previously copied public artifact URLs immediately.

## UI Shape

- `/#/brainstorm` should open into an animated auth-entry modal.
- Signed-in users see the session library inside that modal.
- After auth/guest entry, a mode selection screen appears for NEW sessions (not resumed).
- Two modes: "Open Studio" (existing behavior) and "Creative Spark" (guided inspiration).
- Guests can continue into brainstorm but receive no persistence.
- Public share pages should use the brainstorm visual language without reusing interactive workspace controls.
- Share pages should render in the mode-appropriate layout (masonry gallery for Creative Spark).

## Brainstorm Modes

### Open Studio (formerly "Brainstorm Mode")
- User-driven, open-ended creative workspace
- All 4 tools: save_brainstorm_artifact, generate_brainstorm_image, generate_brainstorm_video, delegate_to_flash
- Model waits for user to initiate
- Layout: AgentVisualizer + WorkspacePanel + ConversationPanel + BrainstormControls

### Creative Spark
- Model-driven guided inspiration mode
- Only 2 tools: generate_brainstorm_image, generate_brainstorm_video
- Model auto-starts speaking with a warmup question
- Layout: Full-screen masonry gallery + collapsible conversation panel + persistent controls
- No agent visualizer, no tool toggles, no model selector

## brainstorm_type vs mode

- `mode` field on BrainstormSessionRecord = session lifecycle ("guest" | "persisted"). DO NOT repurpose.
- `brainstorm_type` field = brainstorm mode ("open_studio" | "creative_spark"). NEW field.
- brainstorm_type defaults to "open_studio" for backward compatibility with legacy sessions.
