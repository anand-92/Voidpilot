---
name: docs-worker
description: Handles updating configuration, linter settings, and AI agent documentation.
---

# docs-worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

For updating `AGENTS.md`, `CLAUDE.md`, `README.md`, setting up `ruff.toml` rules, or adding linters (`mypy`) to `pyproject.toml`.

## Work Procedure

1. Review the existing documentation and configuration files.
2. Implement updates adding crucial missing info: UI architectures (shadcn, framer-motion), explicit test execution commands, environment variable definitions, and frontend IPC security boundaries.
3. Add stricter linter configurations if requested.
4. Verify config changes by running the respective tools to make sure they do not crash the repository.

## Example Handoff

{
  "salientSummary": "Updated `AGENTS.md` and `CLAUDE.md` with explicit UI architecture patterns and frontend IPC guidelines. Added `mypy` to project dependencies.",
  "whatWasImplemented": "Added shadcn and Vite notes to `AGENTS.md`. Included test instructions in `CLAUDE.md`. Added `mypy` to `pyproject.toml`.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "uv run ruff check src/",
        "exitCode": 0,
        "observation": "Ruff check works as expected."
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

- The documentation requires business-level decisions that are not yet established.
