---
name: electron-worker
description: Handles frontend React/Vite development, Electron Main process setup, and IPC.
---

# Electron Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use this skill for all tasks related to the frontend, the Electron Main process, IPC bridging, or integrating `@midscene/computer`.

## Work Procedure
1. Explore the `frontend` folder to understand existing logic.
2. If introducing new Node.js APIs or Electron features, add them to `preload.ts` and ensure typed definitions in the renderer.
3. Write unit tests or component tests (e.g., vitest, jest) BEFORE implementing the actual feature.
4. Ensure `npm run build` or `npm run typecheck` passes.
5. If manually testing, boot the Electron app via Vite's dev server locally and verify using `agent-browser` or manual verification.
6. Commit the changes.

## Example Handoff
```json
{
  "salientSummary": "Wrapped the Vite app in Electron and exposed a basic ping/pong IPC message. Ran `npm run typecheck` successfully.",
  "whatWasImplemented": "Created `frontend/main.ts` and `frontend/preload.ts`. Updated `package.json` to point `main` to the built `main.js`. Added IPC handlers for `ping`.",
  "whatWasLeftUndone": "",
  "verification.commandsRun": [
    { "command": "npm run typecheck", "exitCode": 0, "observation": "All types passed." }
  ],
  "verification.interactiveChecks": [
    { "action": "Booted Electron window and clicked the Ping button", "observed": "Received 'pong' in the console." }
  ],
  "tests.added": [
    { "file": "frontend/tests/ipc.test.ts", "cases": [{ "name": "ping", "verifies": "Main process handles ping" }] }
  ],
  "discoveredIssues": []
}
```

## When to Return to Orchestrator
- The task requires backend Python logic or schema changes not provided.
- An undocumented system limitation blocks Midscene's ability to act.
