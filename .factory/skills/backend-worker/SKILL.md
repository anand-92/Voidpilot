---
name: backend-worker
description: Handles backend Python refactoring for the Voidpilot application.
---

# backend-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for backend-focused features such as:
- FastAPI routes and dependencies
- Firebase token verification and backend access control
- Firestore / Cloud Storage persistence services
- Brainstorm websocket-side persistence hooks
- Python typing, tests, and service-layer refactors that do not require substantial frontend UI work
- Creative Spark backend: system prompt, conversation starters, mode routing, tool filtering, auto-start, session metadata

## Work Procedure

1. Read the feature description, `fulfills`, mission `AGENTS.md`, and relevant `.factory/library/*.md` guidance before coding.
2. Trace the existing backend flow in the relevant files before editing. For brainstorm work this often includes:
   - `src/app/api/v1/endpoints/brainstorm.py`
   - `src/app/services/gemini_audio.py`
   - `src/app/services/ws_manager.py`
   - any new persistence/auth services you introduce
3. Write failing pytest coverage FIRST for any backend behavior change.
4. Prefer narrow, explicit backend abstractions over hidden fallback behavior. Access control must fail clearly for missing, expired, invalid, or wrong-user auth.
5. Preserve the current hardcoded Gemini API key behavior for this mission; do not remove it.
6. Keep auth/persistence scoped to brainstorm only unless the feature explicitly says otherwise.
7. IMPORTANT: The existing `mode` field on BrainstormSessionRecord is for session lifecycle (guest/persisted). Do NOT repurpose it. Use a NEW `brainstorm_type` field for the brainstorm mode (open_studio/creative_spark).
7. Run and fix all backend validators before handoff:
   - `uv run ruff check src/`
   - `uv run mypy src/`
   - `uv run pytest tests/ -v`
8. If the feature changes a cross-stack contract (API shape, websocket message shape, persistence semantics), verify the affected frontend assumptions and mention them in the handoff.

## Example Handoff

```json
{
  "salientSummary": "Added Firebase-backed brainstorm auth verification and persistence service scaffolding to the backend. Private brainstorm routes now reject missing and wrong-user auth cleanly, while public share reads remain unauthenticated.",
  "whatWasImplemented": "Created backend Firebase auth helpers plus brainstorm persistence service scaffolding for Firestore and Cloud Storage. Updated FastAPI dependencies so brainstorm-private flows can verify Firebase ID tokens and distinguish unauthorized callers from valid owners. Preserved the existing hardcoded Gemini API key behavior and kept the changes scoped to brainstorm-specific backend paths.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "uv run pytest tests/test_brainstorm_backend_auth.py -v",
        "exitCode": 0,
        "observation": "Focused auth coverage passed for valid owner, missing token, expired token, and wrong-user cases."
      },
      {
        "command": "uv run ruff check src/",
        "exitCode": 0,
        "observation": "All backend lint checks passed."
      },
      {
        "command": "uv run mypy src/",
        "exitCode": 0,
        "observation": "Backend typing passed with no new issues."
      },
      {
        "command": "uv run pytest tests/ -v",
        "exitCode": 0,
        "observation": "Full backend test suite passed after the new auth/persistence additions."
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "tests/test_brainstorm_backend_auth.py",
        "cases": [
          {
            "name": "test_private_brainstorm_route_rejects_missing_token",
            "verifies": "private brainstorm access is denied when no Firebase auth token is provided"
          },
          {
            "name": "test_private_brainstorm_route_rejects_wrong_user",
            "verifies": "private brainstorm access is denied when the caller is authenticated as a different user"
          },
          {
            "name": "test_public_share_read_remains_unauthenticated",
            "verifies": "public share reads remain accessible without auth while private owner routes stay protected"
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Firebase/GCP project setup is blocked in a way you cannot resolve locally.
- A required backend contract depends on unfinished frontend decisions that make the feature ambiguous.
- Private-vs-public access control cannot be implemented without changing the agreed mission boundaries.
- Existing unrelated backend tests fail and you cannot determine whether fixing them is safe within scope.
