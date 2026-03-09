# Environment

Environment variables, external dependencies, and setup notes.

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google AI API key for Gemini Live access |

## Notes
- `.env` file should exist in project root with `GOOGLE_API_KEY`
- The existing live.py endpoint has a hardcoded fallback API key for development
- No new env vars are needed for Brainstorm Mode — it uses the same `GOOGLE_API_KEY`
- FlashWorker uses the same API key for Flash Lite and Flash Image model calls
- All tests mock the Gemini API — no real API key needed for testing
