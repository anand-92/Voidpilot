# Environment

Environment variables, external dependencies, and setup notes.

**Required Environment Variables:**
- `GOOGLE_API_KEY`: Required for Gemini LLM and flash workers.

**External Dependencies:**
- Node.js (v20+)
- Python (v3.12+)
- `uv` Python package manager

- **Shell Environment**: The agent environment runs on Windows PowerShell. Unix-specific CLI utilities (like grep, find, sed) might fail or behave unexpectedly. Use PowerShell equivalents (like Select-String) or the provided AI tools (Grep, Glob, Edit) instead.
