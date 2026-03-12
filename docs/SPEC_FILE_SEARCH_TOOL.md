## Spec: Add Project Context Search Tool to Walkthrough Agent

### Goal
Add a custom **blocking** tool to the walkthrough agent that delegates to `gemini-flash-latest` with file search, replacing the large hardcoded system prompt with a lightweight identity prompt + instructions to use the tool.

### Verified Approach (via Google Dev Docs)
- **Function calling in Live API**: Tools declared via `tools=[{function_declarations: [...]}]` in `LiveConnectConfig`
- **Default behavior is blocking**: Per docs - "execution pauses until the results of each function call are available" → no need to specify `behavior`, just omit it for blocking
- **Live API doesn't support automatic tool response**: Handled manually in `gemini_audio.py` (already implemented)
- **File Search only works with generate_content**: Must wrap in a custom function that calls `client.models.generate_content()` with the FileSearch tool

### Architecture
```
Walkthrough Agent (gemini-2.5-flash-native-audio-preview-12-2025) [Live API]
    │
    └──► BLOCKING tool: "search_project_context" (function_declarations)
              │
              └──► gemini-flash-latest + FileSearch [generate_content]
                        │
                        └──► File Search Store (populated with /src, /frontend, README, docs)
```

### Implementation Plan

**1. Update Config** (`src/app/core/config.py`)
- Add `GEMINI_FILE_SEARCH_STORE_ID: str` setting

**2. Add File Search Tool Definition** (`src/app/services/tool_defs.py`)
- Add new **blocking** (default) tool definition:
  ```python
  SEARCH_PROJECT_CONTEXT_TOOL_DEF = {
      "function_declarations": [
          {
              "name": "search_project_context",
              # OMIT "behavior" → defaults to blocking
              "description": (
                  "Search the Voidpilot project codebase and documentation "
                  "for relevant context. Use this to answer questions about "
                  "the project's architecture, code, setup, or any technical details."
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
  ```

**3. Create File Search Service** (`src/app/services/file_search_service.py`)
- New async service wrapping Gemini 3 Flash + File Search:
  ```python
  from google import genai
  from google.genai import types
  
  async def search_project_context(
      query: str, 
      api_key: str, 
      file_search_store_name: str
  ) -> str:
      """Search project context using Gemini 3 Flash with File Search."""
      client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})
      
      response = client.models.generate_content(
          model="gemini-flash-latest",
          contents=query,
          config=types.GenerateContentConfig(
              tools=[types.Tool(
                  file_search=types.FileSearch(
                      file_search_store_names=[file_search_store_name]
                  )
              )]
          )
      )
      return response.text
  ```

**4. Replace System Prompt in Walkthrough** (`src/app/api/v1/endpoints/walkthrough.py`)
- Replace ~80-line `SYSTEM_PROMPT` with lightweight version:
  ```python
  SYSTEM_PROMPT = """You are Voidpilot — a digital assistant from beyond the void.
  
  Be helpful, concise, and conversational. When users ask about the Voidpilot 
  project, its code, architecture, or setup, use the search_project_context 
  tool to find relevant information from the codebase and documentation.
  
  Example: If user asks "how does the frontend work?", call search_project_context 
  with query "frontend architecture React Electron Vite"."""
  ```

**5. Update Walkthrough Endpoint** (`src/app/api/v1/endpoints/walkthrough.py`)
- Import `SEARCH_PROJECT_CONTEXT_TOOL_DEF` and the search service
- Add tool to `GeminiLive`: `tools=[SEARCH_PROJECT_CONTEXT_TOOL_DEF]`
- Add tool mapping:
  ```python
  from functools import partial
  
  tool_mapping={
      "search_project_context": partial(
          search_project_context,
          api_key=api_key,
          file_search_store_name=settings.GEMINI_FILE_SEARCH_STORE_ID
      )
  }
  ```
- Keep existing model (`gemini-2.5-flash-native-audio-preview-12-2025`)

### Files Changed
- `src/app/core/config.py` — Add `GEMINI_FILE_SEARCH_STORE_ID`
- `src/app/services/tool_defs.py` — Add `SEARCH_PROJECT_CONTEXT_TOOL_DEF` (blocking by default)
- `src/app/services/file_search_service.py` — New async search function using generate_content + FileSearch
- `src/app/api/v1/endpoints/walkthrough.py` — Lightweight prompt + tool + mapping

### Unchanged
- Model stays `gemini-2.5-flash-native-audio-preview-12-2025`
- Other endpoints (live, brainstorm) unchanged
