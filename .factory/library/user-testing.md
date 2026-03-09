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
