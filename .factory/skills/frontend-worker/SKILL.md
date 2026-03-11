---
name: frontend-worker
description: Handles frontend React, Vite, Tailwind, and Electron architecture refactoring.
---

# frontend-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

For breaking down massive React components, fixing React hooks, improving WebRTC logic, fixing IPC vulnerabilities, and updating layouts/Tailwind code.

## Work Procedure

1. Read the feature description and examine the relevant React files.
2. When extracting components, preserve all existing props and state bindings exactly. Use standard `export function Component(...)` syntax.
3. When refactoring hooks, ensure dependencies arrays are correct to avoid infinite re-renders.
4. If modifying Electron IPC logic (`main.ts` / `preload.ts`), ensure `contextIsolation` rules are maintained.
5. Run `cd frontend && npm run lint` and `npm run build` to verify no import/syntax errors were introduced.

## Example Handoff

{
  "salientSummary": "Deconstructed the monolithic `App.tsx` into `ChatArea.tsx` and `ScreenSharePanel.tsx`. Fixed the missing import bug in `BrainstormUnifiedLayout.tsx`. Lint and build passed.",
  "whatWasImplemented": "Created `frontend/src/components/Chat/ChatArea.tsx` and updated `App.tsx` to use it. Imported `ImageIcon` in `BrainstormUnifiedLayout.tsx`.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd frontend && npm run build",
        "exitCode": 0,
        "observation": "Successfully built dist folder."
      },
      {
        "command": "cd frontend && npm run lint",
        "exitCode": 0,
        "observation": "No linting errors."
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}

## When to Return to Orchestrator

- A build fails due to cascading dependencies that are difficult to trace.
- Found hardcoded UI logic that seems incomplete or buggy and needs orchestrator clarification.
