---
name: fullstack-worker
description: Implements features across FastAPI backend and React frontend for the Voidpilot project.
---

# Fullstack Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that span:
- FastAPI backend (Python): new endpoints, services, schemas
- React frontend (TypeScript): components, hooks, pages, styling
- Integration between backend and frontend (WebSocket endpoints + hooks)

## Work Procedure

### 1. Understand the Feature
- Read the feature description and `fulfills` assertions carefully.
- Read AGENTS.md for baseline commands, project structure, key patterns, and API reference.
- Explore relevant existing code using Grep/Glob to understand patterns before writing anything.
- For backend features: study `walkthrough.py` and `live.py` for WebSocket endpoint patterns, `gemini_audio.py` for GeminiLive class, `bash_agent.py` for genai client usage.
- For frontend features: study `useGeminiLive.ts` for hook patterns, `App.tsx` for UI patterns, `LandingPage.tsx` for routing/navigation.

### 2. Write Tests FIRST (Red Phase)
- **Backend**: Create test file in `tests/` following `test_walkthrough.py` pattern. Mock GeminiLive, settings, and genai client. Write tests that verify the specific behavior described in `fulfills` assertions.
- **Frontend**: No test framework configured — validation is via build + lint + code review.
- Run tests to confirm they FAIL before implementation: `uv run pytest tests/test_<name>.py -v`

### 3. Implement Backend (if applicable)
- Write Python code following existing patterns in `src/app/`.
- Use absolute imports: `from src.app.services.flash_worker import FlashWorker`
- Follow Ruff conventions: line length 88, Python 3.12 target.
- For new endpoints: follow `walkthrough.py` pattern (accept WS, create queues, GeminiLive instance, receive/forward loops).
- For new services: follow `bash_agent.py` pattern (genai.Client, async methods).

### 4. Run Tests (Green Phase)
- Run `uv run pytest tests/ -v` — ALL tests must pass (not just new ones).
- Run `uv run ruff check src/` — must be clean.
- If any test fails, fix the implementation until all pass.

### 5. Implement Frontend (if applicable)
- Write TypeScript/React code in `frontend/src/`.
- Follow existing component patterns: framer-motion animations, TailwindCSS v4 classes, dark theme (bg-[#060818]).
- Use `??` (nullish coalescing) over `||` for defaults.
- Never use eslint-disable comments.
- Reuse shared utilities from `utils/audio.ts` — don't duplicate code.

### 6. Validate Everything
- Run ALL four baseline commands from AGENTS.md:
  1. `uv run ruff check src/` — must exit 0
  2. `uv run pytest tests/ -v` — must exit 0
  3. `cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run build` — must exit 0
  4. `cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run lint` — no new errors (pre-existing warnings OK)
- If ANY command fails, fix the issue before completing.

### 7. Review Your Work
- Re-read all files you created/modified.
- Verify the feature fulfills EVERY assertion listed in `fulfills`.
- Check for hardcoded values, missing imports, dead code, or leftover TODOs.

## Example Handoff

```json
{
  "salientSummary": "Built FlashWorker service with generate_markdown, generate_image, and delegate_task methods. All 3 tests pass with mocked API. Ruff clean, pytest 7 passed, frontend build OK.",
  "whatWasImplemented": "New FlashWorker class at src/app/services/flash_worker.py wrapping gemini-3.1-flash-lite-preview for text and gemini-3.1-flash-image-preview for images. Three async methods: generate_markdown (structures raw ideas into markdown via Flash Lite), generate_image (calls Flash Image with IMAGE modality, extracts inline_data bytes), delegate_task (general-purpose Flash Lite call). Unit tests with mocked genai client verifying model selection, prompt construction, response extraction, and error handling.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "uv run pytest tests/test_flash_worker.py -v", "exitCode": 0, "observation": "3 tests passed in 1.2s" },
      { "command": "uv run ruff check src/", "exitCode": 0, "observation": "All checks passed" },
      { "command": "uv run pytest tests/ -v", "exitCode": 0, "observation": "7 passed in 6.8s (4 existing + 3 new)" },
      { "command": "cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run build", "exitCode": 0, "observation": "Build succeeded" },
      { "command": "cd /Users/dks0662779/gemini-live-3d-bridge/frontend && npm run lint", "exitCode": 0, "observation": "0 errors, 3 pre-existing warnings" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      {
        "file": "tests/test_flash_worker.py",
        "cases": [
          { "name": "test_generate_markdown", "verifies": "Flash Lite called with correct model and prompt, returns structured markdown" },
          { "name": "test_generate_image", "verifies": "Flash Image called with IMAGE modality, extracts inline_data bytes" },
          { "name": "test_delegate_task", "verifies": "Flash Lite called with task+context prompt, returns text result" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A required file referenced in the feature doesn't exist and wasn't expected to be created by this feature.
- Gemini API models or methods don't match the documentation in AGENTS.md.
- An existing test is broken by changes and the fix is unclear.
- Frontend build fails due to dependency issues unrelated to this feature.
- The feature depends on another feature that hasn't been implemented yet (check dependsOn).
