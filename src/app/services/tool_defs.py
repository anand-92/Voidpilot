"""Shared tool definitions for Gemini Live sessions."""

# ── Walkthrough Mode Tools ────────────────────────────────────────────

SEARCH_PROJECT_CONTEXT_TOOL_DEF = {
    "function_declarations": [
        {
            "name": "search_project_context",
            "description": (
                "REQUIRED: Search the Voidpilot project codebase and "
                "documentation. You MUST call this tool before answering "
                "any question about the project. Never guess — always "
                "search first. Use specific technical terms in the query."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query about the project"
                    }
                },
                "required": ["query"],
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

VIDEO_TOOL_DEF = {
    "name": "generate_brainstorm_video",
    "behavior": "NON_BLOCKING",
    "description": (
        "Generate a video to support the brainstorm using Veo 3.1."
        " Call this when a video would help illustrate an idea."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": (
                    "Video generation prompt describing"
                    " the scene and motion"
                ),
            },
            "label": {
                "type": "string",
                "description": ("Short label describing what the video shows"),
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
                "description": ("Optional context information for the task"),
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
        "required": ["task"],
    },
}

BRAINSTORM_TOOLS = [
    {
        "function_declarations": [
            SAVE_ARTIFACT_TOOL_DEF,
            IMAGE_TOOL_DEF,
            VIDEO_TOOL_DEF,
            DELEGATE_TOOL_DEF,
        ]
    }
]
