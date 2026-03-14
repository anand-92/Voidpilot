---
name: frontend-worker
description: Handles frontend React, Vite, Tailwind, and Electron architecture refactoring.
---

# frontend-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

For React component creation and refactoring, hooks, layouts, and Tailwind styling. Includes:
- Mode selection screen, Creative Spark gallery layout, conversation panel, persistent controls
- Conditional layout rendering based on brainstorm_type
- Mobile responsive adaptations
- Breaking down massive components, fixing hooks

## Work Procedure

1. Read the feature description, `fulfills`, mission `AGENTS.md`, and relevant `.factory/library/*.md` files.
2. Examine the relevant React files. For brainstorm features, check:
   - `frontend/src/pages/BrainstormPage.tsx`
   - `frontend/src/hooks/useGeminiBrainstorm.ts`
   - `frontend/src/components/brainstorm/*`
3. When creating new components, follow brainstorm design system: dark theme (`bg-[#0a0a0a]` or similar), glassy effects, amber/orange accents, framer-motion animations.
4. Use `??` over `||` for defaults. Never use eslint-disable comments.
5. Use `motion[as]` pattern for framer-motion dynamic elements (not `motion.create()`).
6. Use inline type modifier for type-only imports: `import { useState, type ReactNode } from 'react'`.
7. When extracting components, preserve all existing props and state bindings. Use standard `export function Component(...)` syntax.
8. When refactoring hooks, ensure dependency arrays are correct to avoid infinite re-renders.
9. Run `cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run lint` and `npm run build` to verify no errors.
10. Manually verify the feature using chrome-devtools if available. If unavailable, document the limitation and continue.

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
