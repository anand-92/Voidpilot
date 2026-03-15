---
name: fullstack-worker
description: Implements walkthrough features that span the FastAPI backend and React frontend.
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for walkthrough slices that span both layers:
- FastAPI backend websocket/tooling behavior in `src/app/*`
- React frontend walkthrough UI/hook behavior in `frontend/src/*`

This mission should use this skill for transport, transcript, tool activity, degraded-state, and end-to-end session-flow work.

## Work Procedure

### 1. Understand the slice before changing code
1. Read the feature description, `fulfills`, `mission.md`, mission `AGENTS.md`, and the relevant `.factory/library/*.md` files.
2. Trace the walkthrough end to end before editing. Start with:
   - `frontend/src/components/landing/IndexView.tsx`
   - `frontend/src/pages/LandingPage.tsx`
   - `frontend/src/components/WalkthroughModal.tsx`
   - `frontend/src/hooks/useWalkthroughAgent.ts`
   - `src/app/api/v1/endpoints/walkthrough.py`
   - `src/app/services/gemini_audio.py`
   - `src/app/services/ws_manager.py`
   - `src/app/services/file_search_service.py`
3. Identify which fulfilled assertions require backend behavior, frontend rendering, or both.
4. Preserve mission invariants:
   - no-sign-in walkthrough entry
   - transcript-first shell
   - session-only transcript state
   - typed fallback and starter prompts share the same live session flow
   - project grounding uses backend tool calls to a separate Gemini + File Search helper

### 2. Write backend tests FIRST when backend behavior changes
1. If the slice changes backend behavior or event shape, add failing pytest coverage first.
2. Prefer focused walkthrough coverage such as:
   - `tests/test_walkthrough.py`
   - `tests/test_gemini_audio_sanitization.py`
   - additional walkthrough-specific websocket/tooling tests if needed
3. Run the targeted tests and confirm they fail before implementation.

### 3. Implement backend behavior cleanly
1. Follow existing FastAPI/service patterns and keep imports absolute from `src.app.*`.
2. Keep the walkthrough route path stable unless the feature explicitly requires coordinated change.
3. Preserve the project-only walkthrough prompt/tool contract.
4. Do not invent native Gemini Live File Search behavior; backend tool calls remain the grounding mechanism.
5. If you touch event shapes, make the client-visible contract explicit and keep failure states visible.

### 4. Implement frontend behavior to match the walkthrough design direction
1. Invoke the `shadcn` skill before composing walkthrough UI structure.
2. Match the landing-page visual language: dark glass surfaces, restrained motion, amber/stone accents.
3. Keep the transcript pane primary and the visualizer/status pane secondary.
4. Use `??` instead of `||` for defaults.
5. Never use eslint-disable comments.

### 5. Manually verify the user flows
1. Use `agent-browser` for browser validation.
2. Restart services fresh from `.factory/services.yaml` before browser checks.
3. Validate the exact flows in `fulfills` and record them in `interactiveChecks`.
4. If microphone-enabled validation is not credible in automation, document the limitation precisely and still validate typed/degraded/session behavior.

### 6. Run validators before finishing
Run these after implementation, fixing failures before handoff:
1. `uv run pytest tests/test_walkthrough.py -v` (or other targeted walkthrough tests added for the feature)
2. `uv run pytest tests/test_gemini_audio_sanitization.py -v` when transcript/tool event handling changed
3. `uv run pytest tests/ -v`
4. `uv run ruff check src/`
5. `uv run mypy src/`
6. `npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run lint`
7. `npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run build`

### 7. Do a final feature audit
Before handoff, verify:
1. Every assertion in `fulfills` is fully completed, not partially addressed.
2. On-topic project questions ground before substantive project-answer content appears.
3. Off-topic prompts redirect without misleading grounding activity.
4. Close/reopen or degraded-state behavior does not leak old transcript/tool state.

## Example Handoff

```json
{
  "salientSummary": "Wired the walkthrough transcript/tooling session end to end. The frontend now renders user and Gemini transcripts, typed fallback travels through the same walkthrough session, grounding activity is visible before on-topic answers, and no-result/degraded states are surfaced without trapping the user.",
  "whatWasImplemented": "Expanded the walkthrough backend/frontend contract so the `/api/v1/live/walkthrough` flow exposes normalized transcript, tool, interruption, and degraded-state information to the UI. Added walkthrough-focused pytest coverage first, then updated the frontend hook and walkthrough surface to render those states in one session history while preserving the project-only prompt and backend tool-call architecture.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "uv run pytest tests/test_walkthrough.py -v", "exitCode": 0, "observation": "Walkthrough websocket tests passed including the new typed/session contract coverage" },
      { "command": "uv run pytest tests/test_gemini_audio_sanitization.py -v", "exitCode": 0, "observation": "Transcript normalization coverage passed" },
      { "command": "uv run pytest tests/ -v", "exitCode": 0, "observation": "Full backend suite passed" },
      { "command": "uv run ruff check src/", "exitCode": 0, "observation": "Ruff passed" },
      { "command": "uv run mypy src/", "exitCode": 0, "observation": "Mypy passed" },
      { "command": "npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run lint", "exitCode": 0, "observation": "Frontend lint passed" },
      { "command": "npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run build", "exitCode": 0, "observation": "Frontend build passed" }
    ],
    "interactiveChecks": [
      { "action": "Used agent-browser to ask an on-topic walkthrough question", "observed": "The walkthrough showed project-context lookup activity before the assistant completed a grounded reply in the transcript." },
      { "action": "Used agent-browser to deny microphone access and submit a typed walkthrough question", "observed": "The walkthrough entered a degraded state but kept typed fallback usable in the same session." },
      { "action": "Used agent-browser to interrupt a Gemini response mid-turn", "observed": "Playback stopped and the transcript remained usable without duplicating the interrupted response." }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "tests/test_walkthrough.py",
        "cases": [
          { "name": "test_walkthrough_text_input_uses_live_session_path", "verifies": "typed walkthrough input enters the same live session path as other turns" },
          { "name": "test_walkthrough_surfaces_tool_activity_events", "verifies": "tool lifecycle events are available for walkthrough grounding UI" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A required backend/frontend contract change would break the mission’s architecture or route/port boundaries.
- A required dependency or credential boundary is missing and prevents implementation or validation.
- The feature cannot be completed truthfully without changing the no-sign-in walkthrough model or inventing unsupported Gemini capabilities.
- Existing test failures appear unrelated to your changes and you cannot determine whether they are safe to fix.
