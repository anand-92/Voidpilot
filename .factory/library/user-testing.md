# User Testing Guide

## Validation Surface

### Primary browser surface
- Use `chrome-devtools` for browser-based validation.
- Do not use `cmux-browser` or `agent-browser` for this mission.
- If `chrome-devtools` fails, is unavailable, or is too limited for popup/network inspection, do not block the mission on the remaining UI validation work; document the limitation and continue.

### Local app setup
- Backend: `127.0.0.1:8000`
- Frontend: `127.0.0.1:5173`
- Brainstorm route: `/#/brainstorm`
- Public share route should remain `HashRouter`-compatible.
- Before browser validation, confirm `8000` and `5173` are serving the current checkout; if stale local servers are bound to those ports, restart via `.factory/services.yaml` or skip browser validation rather than blocking the mission.

### Browser flows to validate
- Brainstorm entry modal on direct load and landing-page navigation
- Email/password sign up
- Email/password sign in
- Google sign-in
- Continue as guest
- Signed-in session library
- New session creation
- Reopen session
- Delete session
- Public share page open as signed-out user
- Public artifact downloads
- Share invalidation after delete

### Audio / media caveat
- Browser automation may not provide a reliable microphone path.
- For brainstorm voice-connect checks, use mocked/fake-media approaches when needed.
- The current backend hardcoded Gemini API key behavior is intentionally preserved for this hackathon mission; do not block validation on env-based Gemini key setup.

## Validation Concurrency

### Browser-based validation
- Max concurrent validators: `1`
- Rationale:
  - local dry run confirmed frontend/backend boot and brainstorm route rendering work
  - browser/GPU cost is the limiting factor on this machine, not backend CPU
  - the `chrome-devtools` validator in this environment uses a shared browser profile that hard-fails when multiple validator sessions try to attach concurrently
  - running a single browser validator at a time avoids profile-lock flake and is the only credible setup for this mission's required browser tool

### Terminal/API validation
- Max concurrent validators: `5`
- Rationale:
  - backend health checks, pytest, mypy, ruff, and curl-based checks are much lighter than browser sessions
  - these checks do not require multiple heavy browser instances

## Known Limitations

- Browser validation for public share pages must confirm no live brainstorm websocket/audio session is started from the public route.
- Google OAuth popup cannot be completed in chrome-devtools automation — the button works, opens the real Google accounts popup, and cancellation is handled gracefully, but full completion requires real Google credentials and interactive popup navigation.
- The chrome-devtools MCP can become disconnected for subagents if a prior session left a browser profile lock. When this happens, API-based validation (Firebase REST API + curl) and code review can serve as a fallback for auth and session CRUD assertions.
- To connect chrome-devtools MCP to Chrome: quit Chrome completely, then start with `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-profile --no-first-run`. Then update `/Users/dks0662779/Library/Application Support/Google/Chrome/DevToolsActivePort` with the port and WebSocket path from the custom profile.
- Firebase auth state persists in IndexedDB (database `firebaseLocalStorageDb`). To simulate a signed-out state, delete all IndexedDB databases and reload.

## Validated API Endpoints

- `GET /api/v1/live/brainstorm/sessions` — lists sessions for authenticated user (requires Firebase bearer token)
- `POST /api/v1/live/brainstorm/sessions` — creates a new persisted session (returns 201)
- `GET /api/v1/live/brainstorm/sessions/{id}` — reopens a session (returns session data or 404 if deleted)
- `DELETE /api/v1/live/brainstorm/sessions/{id}` — deletes a session (returns 204)
- `PUT /api/v1/live/brainstorm/sessions/{id}/turns` — saves turns for a session (returns 200 with turnCount)
- `GET /api/v1/live/brainstorm/sessions/{id}/turns` — loads saved turns for a session
- `PATCH /api/v1/live/brainstorm/sessions/{id}/title` — updates session title
- `PUT /api/v1/live/brainstorm/sessions/{id}/artifacts` — saves artifact (requires Cloud Storage bucket — see Known Limitations)
- `GET /api/v1/live/brainstorm/sessions/{id}/artifacts` — lists artifact metadata
- `GET /api/v1/live/brainstorm/sessions/{id}/artifacts/{aid}/download` — downloads artifact content
- All endpoints return 401 for missing/invalid auth tokens with code `brainstorm_auth_missing` or `brainstorm_auth_invalid`

## Cloud Storage Limitation

The Firebase Cloud Storage bucket `gen-lang-client-0579048282.firebasestorage.app` is **not provisioned**. Artifact upload/download operations return HTTP 404 from the Google Cloud Storage API:

```
google.api_core.exceptions.NotFound: 404 POST https://storage.googleapis.com/upload/storage/v1/b/gen-lang-client-0579048282.firebasestorage.app/o?uploadType=multipart: The specified bucket does not exist.
```

This blocks artifact persistence validation (VAL-SESSION-009, VAL-SESSION-010) and will also block artifact download in share pages. The Firestore operations (sessions, turns, titles) work correctly with the legacy ADC credentials.

To fix: provision the bucket in the Firebase Console or via `gsutil mb gs://gen-lang-client-0579048282.firebasestorage.app`.

## Flow Validator Guidance: browser

- Use `chrome-devtools` only for this mission's browser validation.
- Keep validators inside their assigned browser isolation context; do not reuse auth state, local storage, or cookies across assertion groups unless the prompt explicitly requires a returning-user check.
- For signed-in email/password flows, create a unique Firebase account per validator run using a plus-addressed or timestamped email so parallel validators do not collide on auth or library data.
- Treat the brainstorm library as user-owned state. A validator may create and delete only the sessions it created within its own signed-in account.
- Guest-flow validators must stay signed out for their entire run and must not create or rely on persisted library state.
- If Google popup auth cannot be credibly completed in `chrome-devtools`, capture the exact limitation and mark only the affected Google assertion as blocked rather than guessing.
- Capture evidence for route gating by checking that no brainstorm websocket/session requests start before an entry choice is made.
