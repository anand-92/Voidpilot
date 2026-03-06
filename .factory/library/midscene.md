# Midscene Context and Internal APIs

## Internal APIs
When working with `@midscene/computer` or `@midscene/core` in this project, you may need to use some internal/undocumented APIs:
- `agent.destroy()`: Use to completely terminate and clean up an active agent instance (e.g., when aborting an action).
- `agent.addDumpUpdateListener(callback)`: Use to hook into Midscene's execution and planning phases. The callback receives the `executionDump` object.

## Execution Dump Structure
If you need to extract target coordinates or understand the current phase from the dump listener:
- You can determine the current phase by checking if the active task type is `'Planning'`.
- Target coordinates are found defensively inside tasks. Check `task.element?.center`, `task.param?.center`, or `task.param?.bbox`. Always use defensive optional chaining and `typeof` checks to safely extract these coordinates.

## Caveats and Gotchas
- **Interrupts and Mouse Tracking**: Hardware mouse movement tracking must be restricted exclusively to the `isPlanning` phase. Activating it during the active execution phase will cause false-positive interrupts, because Midscene's own programmatic mouse movement will trigger the tracking logic.
