# User Testing Guide

## Validation Surface

### Primary browser surface
- Use `cmux-browser` first for browser-based validation, per user instruction.
- If `cmux-browser` fails or is unavailable, fall back to `agent-browser`.
- If both browser skills fail, do not block the mission on the remaining UI validation work; document the limitation and continue.

### Local app setup
- Backend: `127.0.0.1:8000`
- Frontend: `127.0.0.1:5173`
- Brainstorm route: `/#/brainstorm`
- Public share route should remain `HashRouter`-compatible.

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
- Max concurrent validators: `2`
- Rationale:
  - local dry run confirmed frontend/backend boot and brainstorm route rendering work
  - browser/GPU cost is the limiting factor on this machine, not backend CPU
  - brainstorm UI already carries non-trivial browser/WebGL overhead
  - keeping concurrency at `2` leaves safe headroom for local dev servers and validator work

### Terminal/API validation
- Max concurrent validators: `5`
- Rationale:
  - backend health checks, pytest, mypy, ruff, and curl-based checks are much lighter than browser sessions
  - these checks do not require multiple heavy browser instances

## Known Limitations

- There is currently no Firebase implementation in the base repo; mission features must establish that before browser auth/share flows can be validated.
- Browser validation for public share pages must confirm no live brainstorm websocket/audio session is started from the public route.
