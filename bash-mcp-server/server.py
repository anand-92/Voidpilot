import os
import signal
import subprocess
import tempfile
import threading
from datetime import datetime, timezone
from typing import Optional

from mcp.server.fastmcp import FastMCP

MAX_TIMEOUT_SECONDS = 24 * 3600
DEFAULT_TIMEOUT_SECONDS = 60
LOG_DIR = tempfile.mkdtemp(prefix="bash_mcp_logs_")

mcp = FastMCP("bash-server")

# ---------------------------------------------------------------------------
# Background process registry
# ---------------------------------------------------------------------------

_bg_lock = threading.Lock()
_bg_processes: dict[int, dict] = {}


def _register_bg(pid: int, command: str, cwd: str, stdout_path: str, stderr_path: str):
    with _bg_lock:
        _bg_processes[pid] = {
            "pid": pid,
            "command": command,
            "cwd": cwd,
            "stdout_log": stdout_path,
            "stderr_log": stderr_path,
            "status": "running",
            "exit_code": None,
            "signal": None,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "ended_at": None,
            "error": None,
        }


def _update_bg(pid: int, **kwargs):
    with _bg_lock:
        if pid in _bg_processes:
            _bg_processes[pid].update(kwargs)


def _get_bg(pid: int) -> Optional[dict]:
    with _bg_lock:
        return dict(_bg_processes.get(pid, {}))


def _format_bg(info: dict) -> str:
    lines = [
        f"PID: {info.get('pid')}",
        f"STATUS: {info.get('status')}",
        f"EXIT_CODE: {info.get('exit_code') if info.get('exit_code') is not None else 'N/A'}",
        f"SIGNAL: {info.get('signal') or 'N/A'}",
        f"STARTED_AT: {info.get('started_at')}",
        f"ENDED_AT: {info.get('ended_at') or 'N/A'}",
        f"CWD: {info.get('cwd')}",
        f"STDOUT_LOG: {info.get('stdout_log')}",
        f"STDERR_LOG: {info.get('stderr_log')}",
        f"COMMAND: {info.get('command')}",
    ]
    if info.get("error"):
        lines.append(f"ERROR: {info['error']}")
    return "\n".join(lines)


def _clamp_timeout(timeout_seconds: int) -> tuple[int, Optional[str]]:
    if timeout_seconds <= MAX_TIMEOUT_SECONDS:
        return timeout_seconds, None
    hint = (
        f"Requested timeoutSeconds={timeout_seconds} exceeds max "
        f"{MAX_TIMEOUT_SECONDS}; capped to {MAX_TIMEOUT_SECONDS}."
    )
    return MAX_TIMEOUT_SECONDS, hint


def _format_result(exit_code, stdout: str, stderr: str, fallback: str) -> str:
    out = f"EXIT_CODE: {exit_code}\n"
    if stdout:
        out += f"STDOUT:\n{stdout}\n"
    if stderr:
        out += f"STDERR:\n{stderr}\n"
    result = out.strip()
    return result if result else f"EXIT_CODE: {exit_code}\n{fallback}"


def _append_hint(text: str, hint: Optional[str]) -> str:
    return f"{text}\n\nHINT: {hint}" if hint else text


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@mcp.tool()
def run(
    command: str,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    cwd: Optional[str] = None,
    env: Optional[dict] = None,
) -> str:
    """Run a shell command in the foreground and return stdout/stderr with exit code.

    WARNING: This tool executes arbitrary shell commands. Ensure this server is
    only accessible by highly trusted clients with strong authentication in place.

    Args:
        command: Shell command to execute (string).
        timeout_seconds: Execution timeout in seconds. Default 60.
        cwd: Working directory override.
        env: Environment variable overrides for the command.
    """
    effective_timeout, hint = _clamp_timeout(timeout_seconds)

    merged_env = None
    if env:
        merged_env = {**os.environ, **env}

    try:
        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=effective_timeout,
            cwd=cwd,
            env=merged_env,
        )
        timed_out = False
        exit_code = str(result.returncode)
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        fallback = "No output returned."
    except subprocess.TimeoutExpired as e:
        timed_out = True
        exit_code = "unknown"
        stdout = (e.stdout or b"").decode(errors="replace").strip() if isinstance(e.stdout, bytes) else (e.stdout or "").strip()
        stderr = (e.stderr or b"").decode(errors="replace").strip() if isinstance(e.stderr, bytes) else (e.stderr or "").strip()
        fallback = f"Command timed out after {effective_timeout} second(s)."
    except Exception as e:
        return f"EXIT_CODE: unknown\nUnexpected error:\n{e}"

    text = _format_result(exit_code, stdout, stderr, fallback)
    return _append_hint(text, hint)


@mcp.tool()
def run_background(
    command: str,
    cwd: Optional[str] = None,
    env: Optional[dict] = None,
) -> str:
    """Start a shell command in the background and capture stdout/stderr to log files.

    WARNING: This tool executes arbitrary shell commands. Ensure this server is
    only accessible by highly trusted clients with strong authentication in place.

    Args:
        command: Shell command to execute in the background.
        cwd: Working directory override.
        env: Environment variable overrides for the command.
    """
    merged_env = None
    if env:
        merged_env = {**os.environ, **env}

    stdout_path = os.path.join(LOG_DIR, f"bg_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_stdout.log")
    stderr_path = os.path.join(LOG_DIR, f"bg_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_stderr.log")

    try:
        stdout_f = open(stdout_path, "w")
        stderr_f = open(stderr_path, "w")
        proc = subprocess.Popen(
            ["bash", "-c", command],
            stdout=stdout_f,
            stderr=stderr_f,
            cwd=cwd,
            env=merged_env,
        )
    except Exception as e:
        return f"EXIT_CODE: unknown\nFailed to start background process:\n{e}"

    pid = proc.pid
    _register_bg(pid, command, cwd or os.getcwd(), stdout_path, stderr_path)

    def _monitor():
        proc.wait()
        stdout_f.close()
        stderr_f.close()
        sig = None
        if proc.returncode is not None and proc.returncode < 0:
            try:
                sig = signal.Signals(-proc.returncode).name
            except Exception:
                sig = str(-proc.returncode)
        _update_bg(
            pid,
            status="completed" if proc.returncode == 0 else ("killed" if sig else "failed"),
            exit_code=proc.returncode,
            signal=sig,
            ended_at=datetime.now(timezone.utc).isoformat(),
        )

    threading.Thread(target=_monitor, daemon=True).start()

    info = _get_bg(pid)
    return _format_bg(info)


@mcp.tool()
def check_background(pid: int) -> str:
    """Check the status of a background process by PID.

    Args:
        pid: The process ID returned by run_background.
    """
    info = _get_bg(pid)
    if not info:
        return f"No background process found with PID {pid}."
    return _format_bg(info)


@mcp.tool()
def read_background_logs(
    pid: int,
    stream: str = "stdout",
    tail: Optional[int] = None,
) -> str:
    """Read the log output of a background process.

    Args:
        pid: The process ID returned by run_background.
        stream: Which stream to read: 'stdout' or 'stderr'. Default 'stdout'.
        tail: If set, return only the last N lines.
    """
    info = _get_bg(pid)
    if not info:
        return f"No background process found with PID {pid}."

    log_path = info.get("stdout_log") if stream == "stdout" else info.get("stderr_log")
    if not log_path or not os.path.exists(log_path):
        return f"Log file not found for PID {pid} stream '{stream}'."

    try:
        with open(log_path, "r", errors="replace") as f:
            lines = f.readlines()
        if tail is not None:
            lines = lines[-tail:]
        return "".join(lines) or "<empty>"
    except Exception as e:
        return f"Error reading log: {e}"


@mcp.tool()
def kill_background(pid: int, force: bool = False) -> str:
    """Kill a background process by PID.

    Args:
        pid: The process ID returned by run_background.
        force: If True, send SIGKILL instead of SIGTERM.
    """
    info = _get_bg(pid)
    if not info:
        return f"No background process found with PID {pid}."

    if info.get("status") not in ("running",):
        return f"Process {pid} is not running (status: {info.get('status')})."

    try:
        sig = signal.SIGKILL if force else signal.SIGTERM
        os.kill(pid, sig)
        _update_bg(pid, status="killed", ended_at=datetime.now(timezone.utc).isoformat())
        return f"Sent {'SIGKILL' if force else 'SIGTERM'} to PID {pid}."
    except ProcessLookupError:
        _update_bg(pid, status="completed", ended_at=datetime.now(timezone.utc).isoformat())
        return f"Process {pid} already exited."
    except Exception as e:
        return f"Error killing process {pid}: {e}"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = port
    mcp.run(transport="sse")
