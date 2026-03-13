# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external services, setup notes, and deployment/environment facts.

## Hackathon Mission Notes

- This mission uses the existing Google Cloud project `gen-lang-client-0579048282` in `us-east1`.
- Firebase Auth, Firestore, and Cloud Storage are the intended persistence services for brainstorm auth/session storage.
- The current backend hardcodes a Gemini API key fallback. For this mission that behavior is intentional and must be preserved; workers should not remove it.
- No separate dev/prod Firebase environments are required for this mission.

## External Dependencies

- Node.js (project already uses npm + Vite frontend)
- Python 3.12+
- `uv` for Python dependency management
- Google Cloud CLI access is already available in the environment
- Firebase CLI is currently not installed; prefer GCP/Firebase setup paths that do not depend on it unless a feature explicitly adds it

## Local Runtime

- Backend dev server runs on `127.0.0.1:8000`
- Frontend dev server runs on `127.0.0.1:5173`

## Required Environment Variables

- There is no new required mission-level environment variable for the Gemini API key because the existing backend fallback must remain in place for this hackathon mission.
- If workers introduce Firebase web/admin configuration, keep the setup minimal and document only the variables actually required by the implementation.
