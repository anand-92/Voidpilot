"""MCP server exposing bash command execution tools.

Provides foreground and background shell execution with log capture,
process monitoring, and lifecycle management via the MCP protocol.
"""

import os
import signal
import subprocess
import tempfile
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

from mcp.server.fastmcp import FastMCP

MAX_TIMEOUT_SECONDS = 24 * 3600
DEFAULT_TIMEOUT_SECONDS = 60
LOG_DIR = tempfile.mkdtemp(prefix="bash_mcp_logs_")

mcp = FastMCP("bash-server")


def _utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO 8601 format."""
    return datetime.now(timezone.utc).isoformat()


def _merge_env(overrides: dict | None) -> dict | None:
    """Merge environment overrides with the current process environment."""
    if not overrides:
        return None
    return {**os.environ, **overrides}


def _decode_stream(data: bytes | str | None) -> str:
    """Safely decode a subprocess output stream that may be bytes, str, or None."""
    if data is None:
        return ""
    if isinstance(data, bytes):
        return data.decode(errors="replace").strip()
    return data.strip()


def _clamp_timeout(timeout_seconds: int) -> tuple[int, str | None]:
    """Clamp timeout to MAX_TIMEOUT_SECONDS, returning an optional warning hint."""
    if timeout_seconds <= MAX_TIMEOUT_SECONDS:
        return timeout_seconds, None
    hint = (
        f"Requested timeoutSeconds={timeout_seconds} exceeds max "
        f"{MAX_TIMEOUT_SECONDS}; capped to {MAX_TIMEOUT_SECONDS}."
    )
    return MAX_TIMEOUT_SECONDS, hint


def _format_result(exit_code: str, stdout: str, stderr: str, fallback: str) -> str:
    """Build a formatted result string from command output."""
    out = f"EXIT_CODE: {exit_code}\n"
    if stdout:
        out += f"STDOUT:\n{stdout}\n"
    if stderr:
        out += f"STDERR:\n{stderr}\n"
    result = out.strip()
    return result if result else f"EXIT_CODE: {exit_code}\n{fallback}"


def _append_hint(text: str, hint: str | None) -> str:
    """Append a hint message if one is present."""
    return f"{text}\n\nHINT: {hint}" if hint else text


@dataclass
class BackgroundProcess:
    """Tracks state and log paths for a background shell process."""

    pid: int
    command: str
    cwd: str
    stdout_log: str
    stderr_log: str
    status: str = "running"
    exit_code: int | None = None
    signal_name: str | None = None
    started_at: str = field(default_factory=_utc_now_iso)
    ended_at: str | None = None
    error: str | None = None

    def format(self) -> str:
        """Return a human-readable summary of this process."""
        lines = [
            f"PID: {self.pid}",
            f"STATUS: {self.status}",
            f"EXIT_CODE: {self.exit_code if self.exit_code is not None else 'N/A'}",
            f"SIGNAL: {self.signal_name or 'N/A'}",
            f"STARTED_AT: {self.started_at}",
            f"ENDED_AT: {self.ended_at or 'N/A'}",
            f"CWD: {self.cwd}",
            f"STDOUT_LOG: {self.stdout_log}",
            f"STDERR_LOG: {self.stderr_log}",
            f"COMMAND: {self.command}",
        ]
        if self.error:
            lines.append(f"ERROR: {self.error}")
        return "\n".join(lines)


_bg_lock = threading.Lock()
_bg_processes: dict[int, BackgroundProcess] = {}


def _register_bg(proc: BackgroundProcess) -> None:
    """Register a new background process in the registry."""
    with _bg_lock:
        _bg_processes[proc.pid] = proc


def _update_bg(pid: int, **kwargs) -> None:
    """Update fields on a registered background process."""
    with _bg_lock:
        if pid in _bg_processes:
            for key, value in kwargs.items():
                setattr(_bg_processes[pid], key, value)


def _get_bg(pid: int) -> BackgroundProcess | None:
    """Return the background process for the given PID, or None if not found."""
    with _bg_lock:
        return _bg_processes.get(pid)


@mcp.tool()
def run(
    command: str,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    cwd: str | None = None,
    env: dict | None = None,
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

    try:
        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=effective_timeout,
            cwd=cwd,
            env=_merge_env(env),
        )
        exit_code = str(result.returncode)
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        fallback = "No output returned."
    except subprocess.TimeoutExpired as exc:
        exit_code = "unknown"
        stdout = _decode_stream(exc.stdout)
        stderr = _decode_stream(exc.stderr)
        fallback = f"Command timed out after {effective_timeout} second(s)."
    except Exception as exc:
        return f"EXIT_CODE: unknown\nUnexpected error:\n{exc}"

    text = _format_result(exit_code, stdout, stderr, fallback)
    return _append_hint(text, hint)


@mcp.tool()
def run_background(
    command: str,
    cwd: str | None = None,
    env: dict | None = None,
) -> str:
    """Start a shell command in the background and capture stdout/stderr to log files.

    WARNING: This tool executes arbitrary shell commands. Ensure this server is
    only accessible by highly trusted clients with strong authentication in place.

    Args:
        command: Shell command to execute in the background.
        cwd: Working directory override.
        env: Environment variable overrides for the command.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    stdout_path = os.path.join(LOG_DIR, f"bg_{timestamp}_stdout.log")
    stderr_path = os.path.join(LOG_DIR, f"bg_{timestamp}_stderr.log")

    try:
        stdout_f = open(stdout_path, "w")
        stderr_f = open(stderr_path, "w")
    except OSError as exc:
        return f"EXIT_CODE: unknown\nFailed to create log files:\n{exc}"

    try:
        proc = subprocess.Popen(
            ["bash", "-c", command],
            stdout=stdout_f,
            stderr=stderr_f,
            cwd=cwd,
            env=_merge_env(env),
        )
    except Exception as exc:
        stdout_f.close()
        stderr_f.close()
        return f"EXIT_CODE: unknown\nFailed to start background process:\n{exc}"

    bg = BackgroundProcess(
        pid=proc.pid,
        command=command,
        cwd=cwd or os.getcwd(),
        stdout_log=stdout_path,
        stderr_log=stderr_path,
    )
    _register_bg(bg)

    def _monitor() -> None:
        proc.wait()
        stdout_f.close()
        stderr_f.close()
        sig = None
        if proc.returncode is not None and proc.returncode < 0:
            try:
                sig = signal.Signals(-proc.returncode).name
            except (ValueError, KeyError):
                sig = str(-proc.returncode)
        status = "completed" if proc.returncode == 0 else ("killed" if sig else "failed")
        _update_bg(
            proc.pid,
            status=status,
            exit_code=proc.returncode,
            signal_name=sig,
            ended_at=_utc_now_iso(),
        )

    threading.Thread(target=_monitor, daemon=True).start()
    return bg.format()


@mcp.tool()
def check_background(pid: int) -> str:
    """Check the status of a background process by PID.

    Args:
        pid: The process ID returned by run_background.
    """
    bg = _get_bg(pid)
    if not bg:
        return f"No background process found with PID {pid}."
    return bg.format()


@mcp.tool()
def read_background_logs(
    pid: int,
    stream: str = "stdout",
    tail: int | None = None,
) -> str:
    """Read the log output of a background process.

    Args:
        pid: The process ID returned by run_background.
        stream: Which stream to read: 'stdout' or 'stderr'. Default 'stdout'.
        tail: If set, return only the last N lines.
    """
    bg = _get_bg(pid)
    if not bg:
        return f"No background process found with PID {pid}."

    log_path = bg.stdout_log if stream == "stdout" else bg.stderr_log
    if not os.path.exists(log_path):
        return f"Log file not found for PID {pid} stream '{stream}'."

    try:
        with open(log_path, "r", errors="replace") as f:
            lines = f.readlines()
        if tail is not None:
            lines = lines[-tail:]
        return "".join(lines) or "<empty>"
    except Exception as exc:
        return f"Error reading log: {exc}"


@mcp.tool()
def kill_background(pid: int, force: bool = False) -> str:
    """Kill a background process by PID.

    Args:
        pid: The process ID returned by run_background.
        force: If True, send SIGKILL instead of SIGTERM.
    """
    bg = _get_bg(pid)
    if not bg:
        return f"No background process found with PID {pid}."

    if bg.status != "running":
        return f"Process {pid} is not running (status: {bg.status})."

    try:
        sig = signal.SIGKILL if force else signal.SIGTERM
        os.kill(pid, sig)
        _update_bg(pid, status="killed", ended_at=_utc_now_iso())
        return f"Sent {'SIGKILL' if force else 'SIGTERM'} to PID {pid}."
    except ProcessLookupError:
        _update_bg(pid, status="completed", ended_at=_utc_now_iso())
        return f"Process {pid} already exited."
    except Exception as exc:
        return f"Error killing process {pid}: {exc}"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    mcp.settings.host = "0.0.0.0"
    mcp.settings.port = port
    mcp.run(transport="sse")
