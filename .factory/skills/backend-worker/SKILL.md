---
name: backend-worker
description: Handles Python FastAPI logic, WebSocket routing, and external API integrations.
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use this skill for Python FastAPI endpoints, routing WebSocket traffic, Gemini API payload modifications, or removing MCP dependencies.

## Work Procedure
1. Explore the `src/app` directory and `pyproject.toml`.
2. Ensure you understand the current `live.py` WebSocket handling.
3. Write `pytest` test cases FIRST. Ensure they fail.
4. Implement the feature and ensure tests pass (`uv run pytest`).
5. Run linting (`uv run ruff check .`).
6. If the feature impacts the frontend connection, manually verify the frontend can still connect.
7. Commit changes.

## Example Handoff
```json
{
  "salientSummary": "Updated the live WebSocket endpoint to handle `image/jpeg` payloads and forward them to the Gemini API as `Part` objects.",
  "whatWasImplemented": "Modified `src/app/api/v1/endpoints/live.py` to parse `image` types from incoming JSON frames. Wrote 3 new test cases.",
  "whatWasLeftUndone": "",
  "verification.commandsRun": [
    { "command": "uv run pytest tests/test_live.py", "exitCode": 0, "observation": "All 3 tests passed." }
  ],
  "verification.interactiveChecks": [
    { "action": "Sent a mock image payload over ws://localhost:8000/api/v1/live/live", "observed": "Backend correctly forwarded to Gemini without crashing." }
  ],
  "tests.added": [
    { "file": "tests/test_live.py", "cases": [{ "name": "test_image_passthrough", "verifies": "Image payloads route correctly" }] }
  ],
  "discoveredIssues": []
}
```

## When to Return to Orchestrator
- Missing Python dependencies.
- API limits or breaking changes from Google GenAI SDK.
