import datetime
import logging
import platform
from collections.abc import Callable, Coroutine
from typing import Any

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

BASH_AGENT_MODEL = "gemini-3-flash-preview"
MAX_TURNS = 10

_SYSTEM_PROMPT = """\
You are a bash execution agent on {os_info}.
Current date/time: {now}.

You have a `run_bash` tool to execute commands on the user's machine.
Each command requires user approval before it runs.

Plan your approach, then call run_bash for each command. Examine output
and iterate as needed. When done, provide a concise summary of what you
did and the results.

Guidelines:
- Keep commands small and safe — user must approve each one.
- Never run destructive commands (rm -rf /, etc).
- If a command fails, analyze the error and try a corrected approach.
- Summarize results — don't just echo raw output."""

_RUN_BASH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="run_bash",
            description=(
                "Execute a bash command on the user's machine"
                " and return stdout/stderr. User sees a"
                " confirmation popup before execution."
            ),
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "command": types.Schema(
                        type=types.Type.STRING,
                        description="The bash command to execute",
                    ),
                    "timeout": types.Schema(
                        type=types.Type.INTEGER,
                        description="Max seconds to wait (default 30, max 120)",
                    ),
                },
                required=["command"],
            ),
        )
    ]
)


def _build_system_prompt() -> str:
    os_info = f"{platform.system()} {platform.release()} ({platform.machine()})"
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return _SYSTEM_PROMPT.format(os_info=os_info, now=now)


async def run_bash_agent(
    task: str,
    api_key: str,
    execute_bash_fn: Callable[..., Coroutine[Any, Any, str]],
) -> str:
    """Multi-turn sub-agent that plans & executes bash
    via Gemini 3 Flash."""
    client = genai.Client(api_key=api_key)

    config = types.GenerateContentConfig(
        system_instruction=_build_system_prompt(),
        tools=[_RUN_BASH_TOOL],
        automatic_function_calling=(types.AutomaticFunctionCallingConfig(disable=True)),
        max_output_tokens=8192,
    )

    contents: list[Any] = [
        types.Content(role="user", parts=[types.Part.from_text(text=task)])
    ]

    for turn in range(MAX_TURNS):
        logger.info("Bash agent turn %d for task: %s", turn, task)

        try:
            response = await client.aio.models.generate_content(
                model=BASH_AGENT_MODEL,
                contents=contents,
                config=config,
            )
        except Exception as e:
            logger.exception("Bash agent LLM call failed")
            return f"Agent failed due to LLM error: {e}"

        if not response.function_calls:
            return response.text or "Agent completed without output."

        # Preserve thought signatures (mandatory for Gemini 3 FC)
        candidates = getattr(response, "candidates", []) or []
        first_candidate = next(iter(candidates), None)
        if first_candidate and getattr(first_candidate, "content", None):
            contents.append(first_candidate.content)

        function_parts = []
        for fc in response.function_calls:
            args = fc.args or {}
            command = args.get("command", "")
            timeout = args.get("timeout", 30)

            logger.info("Bash agent turn %d calling: %s", turn, command)
            try:
                result = await execute_bash_fn(command=command, timeout=timeout)
            except Exception as e:
                logger.exception("Bash command execution failed")
                result = f"Command execution failed: {e}"

            function_parts.append(
                types.Part.from_function_response(
                    name=fc.name or "",
                    response={"result": result},
                )
            )

        contents.append(types.Content(role="user", parts=function_parts))

    return "Agent reached maximum turns without completing."
