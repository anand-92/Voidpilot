# Bash Agent Service

## Overview

The `bash_agent.py` module provides a multi-turn AI agent specifically designed to execute bash commands on the user's machine. It uses Gemini 3 Flash as the underlying language model to plan and execute shell commands based on user tasks.

## Key Functions

### `run_bash_agent`

```python
async def run_bash_agent(
    task: str,
    api_key: str,
    execute_bash_fn: Callable[..., Coroutine[Any, Any, str]],
) -> str
```

A multi-turn agent that plans and executes bash commands via Gemini 3 Flash.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `task` | `str` | The user's task description (e.g., "List files in the current directory") |
| `api_key` | `str` | Google API key for authentication |
| `execute_bash_fn` | `Callable` | Async function to execute the bash command and return output |

#### Returns

- `str`: The final result of the agent's execution or an error message

#### Behavior

1. **Initialization**: Creates a Gemini client with the `gemini-flash-latest` model
2. **System Prompt**: Builds a custom system prompt with OS information and current datetime
3. **Turn-Based Execution**: Runs for up to `MAX_TURNS` (10) iterations:
   - Sends the task/context to Gemini
   - If no function calls, returns the text response
   - If function calls are made, executes each `run_bash` command
   - Feeds the command output back to Gemini for the next turn
4. **Result**: Returns the final response or "Agent reached maximum turns without completing"

## Internal Components

### Model Configuration

- **Model**: `gemini-flash-latest`
- **Max Output Tokens**: 8192
- **Automatic Function Calling**: Disabled (manual control)

### System Prompt Template

The agent is instructed to:
- Execute commands on the user's machine with approval
- Keep commands small and safe
- Never run destructive commands (e.g., `rm -rf /`)
- Analyze errors and try corrected approaches
- Summarize results clearly

### `run_bash` Tool Definition

A function declaration that allows Gemini to execute bash commands:

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | `str` (required) | The bash command to execute |
| `timeout` | `int` (optional) | Max seconds to wait (default 30, max 120) |

## How It Works

### Execution Flow

```
User Task → System Prompt + Task → Gemini Model
                                      ↓
                              If function call:
                              Execute bash command
                                      ↓
                              Feed output back
                                      ↓
                              Repeat (up to 10 turns)
                                      ↓
                              Return final result
```

### Example Usage

```python
async def execute_command(command: str, timeout: int = 30) -> str:
    # Implementation that runs the command
    result = subprocess.run(command, shell=True, capture_output=True, timeout=timeout)
    return result.stdout + result.stderr

result = await run_bash_agent(
    task="Create a new directory called 'test' and list its contents",
    api_key="your-api-key",
    execute_bash_fn=execute_command
)
```

## System Interactions

### Upstream Dependencies

- **Google GenAI Client**: Uses `google.genai` for generating content
- **Platform Info**: Uses Python's `platform` module for OS detection

### Downstream Dependencies

Used by the brainstorm endpoint (`src/app/api/v1/endpoints/brainstorm.py`) to handle complex bash-related tasks within brainstorming sessions.

### Security Considerations

- **User Approval**: The tool description indicates "User sees a confirmation popup before execution" - this is enforced by the frontend
- **Command Safety**: The system prompt explicitly warns against destructive commands
- **Timeout Limits**: Maximum 120 seconds per command to prevent hanging
- **Max Turns**: Limited to 10 iterations to prevent infinite loops

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BASH_AGENT_MODEL` | `"gemini-flash-latest"` | The model used for bash agent |
| `MAX_TURNS` | `10` | Maximum number of agent turns |
