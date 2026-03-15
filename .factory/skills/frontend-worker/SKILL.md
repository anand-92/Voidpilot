---
name: frontend-worker
description: Implements walkthrough-focused React UI work in the Voidpilot frontend.
---

# frontend-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use this skill for walkthrough features that are primarily frontend/UI work, including:
- landing-page walkthrough launch integration
- walkthrough shell/layout redesign
- transcript-first responsive composition
- explainer panel/copy presentation
- accessibility/focus behavior in the walkthrough overlay

## Work Procedure

1. Read the feature description, `fulfills`, `mission.md`, mission `AGENTS.md`, and the relevant `.factory/library/*.md` files before editing.
2. For walkthrough work, inspect the current flow first:
   - `frontend/src/components/landing/IndexView.tsx`
   - `frontend/src/pages/LandingPage.tsx`
   - `frontend/src/components/WalkthroughModal.tsx`
   - `frontend/src/hooks/useWalkthroughAgent.ts`
3. Invoke the `shadcn` skill before composing or restructuring the walkthrough UI. Prefer existing `frontend/src/components/ui/*` primitives over new custom structural markup.
4. Preserve mission invariants while designing:
   - no-sign-in walkthrough launch
   - transcript-first shell
   - voice visualizer/status as secondary context
   - explainer copy stays technically exact
   - starter prompts and typed fallback stay discoverable from the shell
5. Use `??` over `||` for defaults. Never use eslint-disable comments.
6. Use `motion.div`, `motion.span`, etc. directly. Do not use `motion.create()`.
7. Use inline type modifiers for type-only imports when needed.
8. If you add UI-only logic that is cheap to test in an existing harness, add failing coverage first. Do not invent a new frontend test framework unless the feature explicitly requires it. Otherwise, rely on lint/build plus browser validation and document that limitation clearly.
9. Run:
   - `npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run lint`
   - `npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run build`
10. Validate the walkthrough in `agent-browser`:
   - launch from landing
   - verify transcript-first shell and explainer reachability
   - verify keyboard open/close/focus behavior
   - verify narrow/mobile layout reachability
11. If required transport state is missing from the backend/hook, return to the orchestrator instead of faking UI behavior.

## Example Handoff

```json
{
  "salientSummary": "Rebuilt the walkthrough into a transcript-first split-pane overlay, kept the landing-page no-sign-in launch intact, and added a dedicated How it works panel with technically exact copy. Frontend lint/build passed and browser checks confirmed keyboard close/focus return plus narrow-layout reachability.",
  "whatWasImplemented": "Updated the landing walkthrough flow and `WalkthroughModal` composition so the transcript is primary, the visualizer/status area is secondary, starter prompts and typed entry are visible from the shell, and the walkthrough exposes a dedicated explainer panel that accurately describes the Gemini Live plus backend tool-call plus helper File Search architecture.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run lint",
        "exitCode": 0,
        "observation": "Frontend lint passed with no new errors."
      },
      {
        "command": "npm --prefix /Users/dks0662779/gemini-live-3d-bridge/frontend run build",
        "exitCode": 0,
        "observation": "Frontend build succeeded."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Used agent-browser to open the landing page and launch Talk to Voidpilot",
        "observed": "The walkthrough opened in place with a transcript-first split-pane shell and no sign-in gate."
      },
      {
        "action": "Used agent-browser keyboard navigation to tab through the walkthrough and press Escape to dismiss it",
        "observed": "Focus stayed within the overlay while open, Escape closed it, and focus returned to the launcher."
      },
      {
        "action": "Used agent-browser to validate a narrow viewport with the walkthrough open",
        "observed": "Transcript, explainer access, close control, and typed entry remained reachable without horizontal scrolling."
      }
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature depends on transport/backend state that does not exist yet or is too inconsistent to render truthfully.
- The requested UI requires changing mission boundaries (new route, new service, auth gate, different ports).
- Browser validation cannot credibly verify a required shell assertion and you need orchestrator guidance on the limitation.
