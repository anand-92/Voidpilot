import os
import subprocess
from mcp.server.fastmcp import FastMCP

COMMAND_TIMEOUT = 120

# Create the MCP server
mcp = FastMCP("bash-server")

@mcp.tool()
def execute_command(command: str) -> str:
    """Executes a bash/shell command and returns the output.
    
    WARNING: This tool allows execution of arbitrary shell commands. It is vulnerable to 
    Command Injection. Ensure this server is only accessible by highly trusted clients and 
    that strong authentication and authorization are in place.
    
    Args:
        command: The shell command to execute.
    """
    try:
        # Run the command with bash
        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT
        )
        output = []
        if result.stdout:
            output.append(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            output.append(f"STDERR:\n{result.stderr}")
        
        output.append(f"EXIT CODE: {result.returncode}")
        
        return "\n\n".join(output)
    except subprocess.TimeoutExpired:
        return f"Error: Command timed out after {COMMAND_TIMEOUT} seconds."
    except Exception as e:
        return f"Error executing command: {e}"

if __name__ == "__main__":
    # Determine port from Cloud Run environment variable
    port = int(os.environ.get("PORT", 8080))
    # Update settings to bind to the correct host and port
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = port
    # Run the server using SSE transport so it can be accessed over HTTP
    mcp.run(transport="sse")
