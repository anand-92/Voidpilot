# Frontend Electron Setup

## Vite Configuration
Vite requires `base: './'` in `vite.config.ts` for Electron apps to load `index.html` from `dist` correctly via the `file://` protocol. Otherwise, it defaults to `/` and assets will fail to load.

## Environment Variables
The `services.yaml` commands must use Windows PowerShell syntax for environment variables (e.g., `$env:PORT=8000;`) and Windows executables (e.g., `curl.exe` instead of `curl` for healthchecks) since this is a Windows 32 environment.
