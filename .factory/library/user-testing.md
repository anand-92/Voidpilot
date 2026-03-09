# User Testing

## Testing Surface
- **Backend**: Unit tests via pytest with mocked Gemini API
- **Frontend**: Build verification (tsc + vite build) and ESLint linting
- **No runtime testing**: This is an audio-dependent app (Gemini Live requires real API + microphone). Automated end-to-end testing is not feasible.

## Testing Tools
- `uv run pytest tests/ -v` — Python test runner
- `cd frontend && npm run build` — TypeScript compilation + Vite bundle
- `cd frontend && npm run lint` — ESLint checking

## What Can Be Validated
- Code correctness: tool declarations, scheduling values, WebSocket message types
- Component structure: route registration, layout structure, state management
- Build integrity: all TypeScript compiles, all Python passes ruff
- Test coverage: mocked API tests for FlashWorker and brainstorm endpoint

## What Cannot Be Validated Automatically
- Voice conversation quality (requires real Gemini Live API + microphone)
- Actual artifact generation (requires real Flash Lite/Image API calls)
- Audio playback quality
- Real-time WebSocket artifact push behavior

## Known Limitations
- No .env file exists — tests mock all API calls
- Port 8000 is occupied by another process — dev server not started
- Frontend has no test framework (no vitest/jest) — validation is build + lint only

## Flow Validator Guidance: Code Review

This application is audio-dependent (Gemini Live requires real API + microphone). Frontend assertions are validated via **source code review** — reading the actual source files and verifying the code structures, imports, and patterns described in each assertion.

### How to validate
- Use `Read` tool to read source files
- Use `Grep` tool to search for specific patterns (imports, component names, function calls)
- Verify structural patterns (JSX layout, hook API, message handlers) by reading the code
- For build/lint/test assertions, the build commands have already been run by the parent validator — reference their exit codes

### Key source files for brainstorm-frontend
- `frontend/package.json` — dependency declarations
- `frontend/src/main.tsx` — route definitions
- `frontend/src/pages/LandingPage.tsx` — landing page with nav cards
- `frontend/src/pages/BrainstormPage.tsx` — main brainstorm page component
- `frontend/src/hooks/useGeminiBrainstorm.ts` — brainstorm WebSocket hook
- `frontend/src/utils/audio.ts` — shared audio utilities
- `frontend/src/components/icons/CustomIcons.tsx` — custom icon components

### Isolation
Code review subagents are read-only — no isolation concerns. Multiple subagents can read the same files simultaneously.

### Report format
Each flow validator writes a JSON report with assertion-level pass/fail and evidence.
