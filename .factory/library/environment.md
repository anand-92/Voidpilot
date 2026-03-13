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
- Brainstorm backend Firebase services now require `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET` before private brainstorm auth/persistence paths can initialize successfully.
- `FIREBASE_LOCATION` defaults to `us-east1`, so workers only need to override it if the mission explicitly moves Firebase resources elsewhere.
- `FIREBASE_CREDENTIALS_JSON` is optional. When it is unset, the backend falls back to Google Application Default Credentials; local validation can use ADC or a service-account JSON payload, but project/bucket settings still need to be present.
- The brainstorm frontend auth flow uses checked-in public Firebase web config from `frontend/src/lib/firebaseWebConfig.ts`, so this mission does not require additional `VITE_` Firebase env vars for the browser app.
- Google popup auth depends on the active frontend origin being allowed by Firebase Auth. Local validation should use the standard brainstorm dev origin (`http://127.0.0.1:5173`) unless the Firebase project is updated to allow additional origins.
