---
name: backend-worker
description: Handles backend Python refactoring for the Voidpilot application.
---

# backend-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

For modifying Python API routes, core logic, or background services, primarily around code structure, type hints, error handling, and separation of concerns.

## Work Procedure

1. Read the feature description and related codebase context.
2. Formulate a refactoring plan that doesn't change business functionality.
3. Apply the changes strictly according to Python typing rules and the FastAPI framework standards.
4. Run `uv run pytest tests/` and `uv run ruff check src/` and `uv run mypy src/`. Fix ALL errors.
5. If the refactored code relies on environment variables, ensure validation using Pydantic Settings.

## Example Handoff

{
  "salientSummary": "Refactored `flash_worker.py` to add `try/except` around LLM calls, checked array boundaries on `parts`, and updated types. Tests run successfully.",
  "whatWasImplemented": "Replaced blind `response.candidates[0].content.parts` with safe `.get()` traversals and proper fallback error logging in `flash_worker.py`.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "uv run pytest tests/test_flash_worker.py",
        "exitCode": 0,
        "observation": "All 9 tests passed."
      },
      {
        "command": "uv run mypy src/app/services/flash_worker.py",
        "exitCode": 0,
        "observation": "Success: no issues found in 1 source file"
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

- Tests unrelated to the changed code suddenly fail.
- Found severe logical bugs beyond refactoring scope that need user approval to fix.
