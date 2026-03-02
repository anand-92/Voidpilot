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

def _create_mcp_tool_caller(mcp_session: ClientSession, tool_name: str):
    async def make_mcp_tool_call(**kwargs):
        logger.info(f"Calling MCP tool: {tool_name} with args: {kwargs}")
        try:
            result = await mcp_session.call_tool(tool_name, kwargs)
            # Extract the text content from the MCP result
            # MCP results typically contain a list of content blocks
            content_parts = []
            for content in result.content:
                if content.type == "text":
                    content_parts.append(content.text)
            
            return "\n".join(content_parts)
        except Exception as e:
            logger.error(f"Error executing MCP tool {tool_name}: {e}")
            logger.error(traceback.format_exc())
            return f"Error executing {tool_name}: {str(e)}"
    
    return make_mcp_tool_call

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
            
            # Register in tool mapping
            tool_mapping[tool.name] = _create_mcp_tool_caller(mcp_session, tool.name)

        gemini_tools = [{"function_declarations": declarations}] if declarations else []
        return gemini_tools, tool_mapping

    except Exception as e:
        logger.error(f"Failed to fetch MCP tools: {e}")
        return [], {}
