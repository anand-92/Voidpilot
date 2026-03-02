import asyncio
import logging
import traceback
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Tuple

from mcp import ClientSession
from mcp.client.sse import sse_client

logger = logging.getLogger(__name__)

@asynccontextmanager
async def get_mcp_session(server_url: str):
    """
    Connects to a remote MCP server via SSE and yields the ClientSession.
    """
    # FastMCP uses /sse by default. Append if the base URL was provided.
    if not server_url.endswith("/sse"):
        server_url = f"{server_url.rstrip('/')}/sse"

    logger.info(f"Connecting to MCP server at {server_url}")
    async with sse_client(server_url) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as mcp_session:
            await mcp_session.initialize()
            logger.info("MCP session initialized")
            yield mcp_session

async def fetch_mcp_tools(mcp_session: ClientSession) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Fetches tools from the initialized MCP session and returns
    the Gemini-compatible tools declaration and a tool_mapping dict.
    """
    try:
        mcp_tools = await mcp_session.list_tools()
        
        declarations = []
        tool_mapping = {}

        for tool in mcp_tools.tools:
            # Create Gemini-compatible declaration
            declarations.append({
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema,
            })
            
            # Create a wrapper function that calls the tool on the MCP server
            async def make_mcp_tool_call(name=tool.name, **kwargs):
                logger.info(f"Calling MCP tool: {name} with args: {kwargs}")
                try:
                    result = await mcp_session.call_tool(name, kwargs)
                    # Extract the text content from the MCP result
                    # MCP results typically contain a list of content blocks
                    content_parts = []
                    for content in result.content:
                        if content.type == "text":
                            content_parts.append(content.text)
                    
                    return "\n".join(content_parts) if content_parts else str(result.content)
                except Exception as e:
                    logger.error(f"Error executing MCP tool {name}: {e}")
                    logger.error(traceback.format_exc())
                    return f"Error executing {name}: {str(e)}"
            
            # Register in tool mapping
            tool_mapping[tool.name] = make_mcp_tool_call

        gemini_tools = [{"function_declarations": declarations}] if declarations else []
        return gemini_tools, tool_mapping

    except Exception as e:
        logger.error(f"Failed to fetch MCP tools: {e}")
        return [], {}
