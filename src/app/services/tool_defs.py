"""Shared tool definitions for Gemini Live sessions."""

# ── Live Mode Tools ────────────────────────────────────────────

MIDSCENE_TOOL_DEF = {
    "function_declarations": [
        {
            "name": "execute_midscene_action",
            "behavior": "NON_BLOCKING",
            "description": (
                "Execute a UI action on the user's desktop using"
                " Midscene.js. Use this to click buttons, type"
                " text, or navigate the UI."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "description": (
                            "The Midscene action prompt to execute"
                            " (e.g., 'Click the Login button',"
                            ' \'Type "hello" into the search'
                            " bar')."
                        ),
                    }
                },
                "required": ["action"],
            },
        }
    ]
}

BASH_AGENT_TOOL_DEF = {
    "function_declarations": [
        {
            "name": "bash_agent",
            "behavior": "NON_BLOCKING",
            "description": (
                "Delegate a bash/shell task to a specialized agent"
                " powered by Gemini 3 Flash. It will plan and"
                " execute commands to accomplish the task. Each"
                " command requires user confirmation before running."
                " Describe WHAT you want done, not HOW."
                " Examples: 'List all Python files in home',"
                " 'Find the 5 largest files on Desktop',"
                " 'Check which version of node is installed'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": (
                            "Natural language description of the"
                            " bash task to accomplish"
                        ),
                    }
                },
                "required": ["task"],
            },
        }
    ]
}

# ── Brainstorm Mode Tools ────────────────────────────────────────────

SAVE_ARTIFACT_TOOL_DEF = {
    "name": "save_brainstorm_artifact",
    "behavior": "NON_BLOCKING",
    "description": (
        "Save structured brainstorm ideas as a markdown artifact."
        " Call this when ideas crystallize into structured content."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Title for the brainstorm artifact",
            },
            "raw_ideas": {
                "type": "string",
                "description": ("Raw brainstorm ideas to structure into markdown"),
            },
            "filename": {
                "type": "string",
                "description": ("Filename for the artifact (e.g. 'ideas.md')"),
            },
        },
        "required": ["title", "raw_ideas", "filename"],
    },
}

IMAGE_TOOL_DEF = {
    "name": "generate_brainstorm_image",
    "behavior": "NON_BLOCKING",
    "description": (
        "Generate a visual image to support the brainstorm."
        " Call this when a visual would help illustrate an idea."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "Image generation prompt",
            },
            "label": {
                "type": "string",
                "description": ("Short label describing what the image shows"),
            },
        },
        "required": ["prompt", "label"],
    },
}

DELEGATE_TOOL_DEF = {
    "name": "delegate_to_flash",
    "behavior": "NON_BLOCKING",
    "description": (
        "Delegate an analysis, research synthesis, or structured"
        " data extraction task to a background Flash worker."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "task": {
                "type": "string",
                "description": "The task to perform",
            },
            "context": {
                "type": "string",
                "description": ("Context information for the task"),
            },
            "output_format": {
                "type": "string",
                "enum": [
                    "markdown_section",
                    "json",
                    "summary",
                ],
                "description": ("Desired output format (defaults to markdown_section)"),
            },
        },
        "required": ["task", "context"],
    },
}

BRAINSTORM_TOOLS = [
    {
        "function_declarations": [
            SAVE_ARTIFACT_TOOL_DEF,
            IMAGE_TOOL_DEF,
            DELEGATE_TOOL_DEF,
        ]
    }
]
