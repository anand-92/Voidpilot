# MCP Integration Follow-ups & Assumptions

## Implementation
I have added basic support for connecting to a remote MCP server using the `mcp` python SDK.
- The `mcp` dependency has been added to the project via `uv add mcp`.
- Created a new service `src/app/services/mcp_client.py` which abstracts connection to an SSE MCP server.
- The service provides a function `get_mcp_tools(mcp_server_url)` that returns the `tools` array for Gemini and a `tool_mapping` dictionary.
- Modified `src/app/services/gemini_audio.py` and `src/app/api/v1/endpoints/live.py` to conditionally include these tools if the environment variable `MCP_SERVER_URL` is provided.

## Assumptions
1. **Transport**: The issue mentions a remote bash environment running on Cloud Run, which uses SSE transport (`sse_client`). I've assumed SSE is the transport method and built `mcp_client.py` around `mcp.client.sse.sse_client`.
2. **Configuration**: I assumed that the server URL would be provided as an environment variable (`MCP_SERVER_URL`), which is the standard way to configure such things in this FastAPI architecture.
3. **Session Lifecycle**: The MCP session must stay alive as long as the Gemini session is alive. Currently, the implementation connects to the MCP session inside the `start_session` of `GeminiLive` but since `GeminiLive` might be called multiple times or run continuously, I made the `mcp_client` functions async and manageable. Actually, integrating it seamlessly means we need to hold the MCP session open. Since `sse_client` is an async context manager, I'll structure it so `GeminiLive.start_session` manages the MCP context if a URL is provided.

## Follow-ups / Action Items
1. **Error Handling & Reconnection**: If the Cloud Run MCP server container dies (as mentioned in the issue: "cloud run is stateless"), the SSE connection will drop. The current implementation doesn't have robust retry/reconnect logic for the MCP server.
2. **Statefulness**: Since Cloud Run is stateless, if the bash commands rely on persistent disk state, we might need to mount a GCS FUSE volume or switch the MCP server backend to a VPS, as noted in the issue. This needs to be configured on the *MCP server side*, not the bridge, but the bridge users should be aware.
3. **Security**: Right now, the MCP client doesn't pass authorization headers. If the Cloud Run endpoint requires IAM or bearer tokens, we'll need to update `mcp_client.py` to pass headers (e.g. Identity-Aware Proxy or generic bearer tokens).
4. **Tool Call Mapping**: The issue mentions converting `result.content` back to Gemini. MCP tools return complex content arrays (often with `type="text"`). Our tool mapping needs to properly extract this text to send back to Gemini.
5. **Testing**: Add unit and integration tests for the `mcp_client` to mock SSE streams.
