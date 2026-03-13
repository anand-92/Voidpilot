---
name: fullstack-worker
description: Implements features across FastAPI backend and React frontend for the Voidpilot project.
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for vertical slices that span both of these layers:
- FastAPI backend (Python): routes, services, persistence, access control, websocket/session behavior
- React frontend (TypeScript): pages, hooks, modal flows, library/share UI, styling

This mission’s brainstorm auth/persistence/share features should usually use this skill.

## Work Procedure

### 1. Understand the slice before changing code
1. Read the feature description, `fulfills`, `mission.md`, mission `AGENTS.md`, and the relevant `.factory/library/*.md` files.
2. Identify the user-visible behaviors this slice must complete.
3. Trace the existing brainstorm flow end-to-end before editing. For this project that usually means checking:
   - `frontend/src/pages/BrainstormPage.tsx`
   - `frontend/src/hooks/useGeminiBrainstorm.ts`
   - `frontend/src/components/brainstorm/*`
   - `src/app/api/v1/endpoints/brainstorm.py`
   - `src/app/services/gemini_audio.py`
4. If the feature touches auth/persistence/sharing, keep the mission architecture intact:
   - frontend owns auth UI/state
   - backend owns persistence and access control
   - guest sessions remain ephemeral
   - public share pages remain read-only and must not start live brainstorm sessions

### 2. Write backend tests FIRST when backend behavior changes
1. If the slice changes any backend behavior, write failing pytest coverage before implementation.
2. Add tests that prove the exact assertions listed in `fulfills`.
3. Prefer focused tests for the changed behavior first, then expand to the full suite.
4. Run the targeted tests and confirm they fail before implementation.

### 3. Implement backend behavior cleanly
1. Follow existing FastAPI and service patterns in `src/app`.
2. Keep imports absolute from `src.app.*`.
3. Preserve the current hardcoded Gemini API key behavior; do not remove it in this mission.
4. For brainstorm persistence, prefer backend-owned writes over direct browser-owned Firestore writes.
5. If you add auth checks, ensure wrong-user and missing-token cases fail explicitly.

### 4. Implement frontend behavior to match the design system
1. Follow `frontend/DESIGN_SYSTEM.md` closely.
2. Keep brainstorm visuals dark, glassy, motion-rich, and amber/orange-accented.
3. Use `??` instead of `||` for defaults.
4. Never use eslint-disable comments.
5. Keep guest vs signed-in states explicit in the UI.
6. Do not accidentally expose live workspace controls on read-only public share pages.

### 5. Manually verify the user flows
1. Use `cmux-browser` first for browser validation.
2. If `cmux-browser` fails, use `agent-browser`.
3. If both fail, document the limitation explicitly in the handoff.
4. For every fulfilled user-visible flow, add an `interactiveChecks` entry that states:
   - what you did
   - what you observed
   - whether you used `cmux-browser`, `agent-browser`, or had to skip UI validation

### 6. Run validators before finishing
Run these after implementation, fixing failures before handoff:
1. `uv run ruff check src/`
2. `uv run mypy src/`
3. `uv run pytest tests/ -v`
4. `cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run lint`
5. `cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run build`

If the feature changes only a narrow backend area, you may run a focused pytest target during iteration, but the full pytest suite must pass before completion.

### 7. Do a final feature audit
Before handoff, verify:
1. Every assertion in `fulfills` is fully completed, not partially addressed.
2. You did not regress landing-page or walkthrough behavior unless the feature explicitly required it.
3. Guest sessions are still ephemeral where required.
4. Public share pages do not expose live brainstorm controls or private owner actions.

## Example Handoff

```json
{
  "salientSummary": "Built the brainstorm entry modal and signed-in library bootstrap flow. Signed-in users now land in a library-first modal state, guests can continue explicitly, and the brainstorm workspace no longer becomes interactive before an entry choice.",
  "whatWasImplemented": "Added Firebase-auth-backed brainstorm entry UI plus backend support needed for the modal flow. The `/brainstorm` route now opens an animated brainstorm-styled entry modal with sign-up, sign-in, Google auth, and guest entry. Successful auth returns the user to a library-first modal state; guest entry goes to the workspace with explicit ephemerality messaging. The background workspace no longer starts the brainstorm websocket until the user chooses a path.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "uv run pytest tests/test_brainstorm_auth_flow.py -v", "exitCode": 0, "observation": "5 tests passed covering token validation, modal bootstrap API behavior, and guest no-op session mode" },
      { "command": "uv run ruff check src/", "exitCode": 0, "observation": "All checks passed" },
      { "command": "uv run mypy src/", "exitCode": 0, "observation": "Success: no issues found" },
      { "command": "uv run pytest tests/ -v", "exitCode": 0, "observation": "All backend tests passed including the new auth/persistence coverage" },
      { "command": "cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run build", "exitCode": 0, "observation": "Build succeeded" },
      { "command": "cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run lint", "exitCode": 0, "observation": "Lint passed with no new errors" }
    ],
    "interactiveChecks": [
      { "action": "Used cmux-browser to open /#/brainstorm in a signed-out state and inspect the first paint", "observed": "Animated brainstorm entry modal appeared before the workspace was usable" },
      { "action": "Used cmux-browser to complete sign-in and observe the post-auth destination", "observed": "Successful auth returned to the signed-in library inside the modal instead of dropping directly into the workspace" },
      { "action": "Used cmux-browser to choose Continue as guest and inspect the workspace", "observed": "Guest entered the workspace with explicit ephemerality messaging and no signed-in library controls" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "tests/test_brainstorm_auth_flow.py",
        "cases": [
          { "name": "test_private_brainstorm_auth_rejects_missing_token", "verifies": "brainstorm-private routes fail for missing auth" },
          { "name": "test_signed_in_brainstorm_bootstrap_returns_library_state", "verifies": "successful auth enters library-first brainstorm flow" },
          { "name": "test_guest_session_does_not_create_persisted_state", "verifies": "guest mode stays ephemeral" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Firebase setup or access is blocked in a way you cannot resolve from the repo and local tooling.
- A required dependency or credential boundary is missing and prevents implementation or validation.
- The feature requires changing mission boundaries (for example, expanding auth beyond brainstorm or removing the hardcoded Gemini key behavior).
- Browser validation fails in both `cmux-browser` and `agent-browser`, and the feature cannot be credibly verified without user help.
- Existing test failures appear unrelated to your changes and you cannot determine whether they are safe to fix.
