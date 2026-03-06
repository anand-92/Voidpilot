# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Environment Variables
- `GOOGLE_API_KEY`: Required. Must be exposed to the Python backend to initialize the Gemini Live connection.
- `MCP_SERVER_URL`: Should be removed/ignored for this mission, as we are deleting MCP.

## External Dependencies
- `@midscene/computer` requires the vision model API key. For testing, it will use the default Gemini API key provided.
- `desktopCapturer` requires explicit screen recording permissions on Mac (not applicable to this Windows environment).
