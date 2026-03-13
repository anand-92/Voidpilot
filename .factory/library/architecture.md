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
- Guests can continue into brainstorm but receive no persistence.
- Public share pages should use the brainstorm visual language without reusing interactive workspace controls.
