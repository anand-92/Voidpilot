# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external dependencies, setup notes, and environment facts. Do not put service ports/commands here; those belong in `.factory/services.yaml`.

## Mission Notes

- This mission only needs the existing backend + frontend app stack; it does not introduce any new database, cache, or queue dependency.
- Docker is not required for this mission.
- Full voice validation needs a local browser session with microphone permission enabled.

## External Dependencies

- Node.js + npm for the Vite frontend
- Python 3.12+ with `uv`
- Google Gemini access for the walkthrough backend

## Required Environment Variables

- `GOOGLE_API_KEY` is required by backend settings and must be present in the repo root `.env`.
- `GEMINI_FILE_SEARCH_STORE_ID` is already configured in `src/app/core/config.py` with the current walkthrough project-context store; no new mission-specific env var is required for it.

## Relevant Existing Configuration

- The walkthrough backend uses the configured File Search store to ground project answers through `search_project_context`.
- The mission does not require additional Firebase or browser `VITE_` configuration changes.
- If a worker touches unrelated brainstorm/Firebase code during this mission, that should be treated as suspicious unless the walkthrough change truly depends on it.

## Validation Notes

- Browser validation should restart the backend and frontend fresh using `.factory/services.yaml` before checking the walkthrough flow.
- Browser automation can validate most shell and transcript/tooling UI states, but final microphone-enabled voice checks may require a headed local browser session.
