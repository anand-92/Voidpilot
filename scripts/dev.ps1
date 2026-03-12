# --- Gemini Live Unified Dev Kill any existing processes Script (Windows) ---

Write-Host "[System] Checking for existing processes on ports 8000 and 5173..." -ForegroundColor Cyan

# Function to kill processes by port
function Kill-Port($port) {
    $processes = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($p in $processes) {
            Stop-Process -Id $p.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

Kill-Port 8000
Kill-Port 5173
Start-Sleep -Seconds 1

Write-Host "[System] Launching Backend (8000) and Frontend (5173)..." -ForegroundColor Cyan

# Start Backend using cmd.exe so uv can be correctly resolved
$backend = Start-Process -NoNewWindow -PassThru -FilePath "cmd.exe" -ArgumentList "/c uv run uvicorn src.app.main:app --host 127.0.0.1 --port 8000"

# Start Frontend using cmd.exe so npm can be correctly resolved
$frontend = Start-Process -NoNewWindow -PassThru -FilePath "cmd.exe" -ArgumentList "/c cd frontend && npm run dev -- --host 127.0.0.1 --clearScreen false"

try {
    # Keep the script running until the user presses Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n[System] Shutting down Gemini Live..." -ForegroundColor Cyan
    if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    
    # Also aggressively kill processes using the ports in case child processes detached
    Kill-Port 8000
    Kill-Port 5173
}
