# Codebase Sweep & AI Readiness Refactor Summary

This document summarizes the changes made during the `refactor/codebase-sweep-clean` mission. The primary goal of this mission was to simplify the codebase, resolve architectural technical debt, improve error handling, and dramatically increase the "AI-readiness" of the repository via exhaustive documentation updates, without altering any business logic or adding new features.

## 1. Backend Architecture & Security Improvements

### Decoupling `GeminiLive` God Function
The `src/app/services/gemini_audio.py` file contained a massive `start_session` method (>400 lines) with deeply nested closures representing the connection loop, tool handlers, and message receivers. 
- **Action**: We extracted these into distinct class methods (`_receive_loop`, `_handle_server_content`, `_handle_tool_call`, etc.).
- **Impact**: The websocket handler is now vastly easier to read, test, and maintain. 

### Extracting WebSocket Route Boilerplate
The individual websocket endpoint files (`live.py`, `brainstorm.py`, `walkthrough.py`) duplicated massive amounts of logic for queue management, loop execution, and inline tool schemas.
- **Action**: Created `src/app/services/ws_manager.py` to abstract the connection boilerplate, and `src/app/services/tool_defs.py` to store the raw Gemini `Tool` declarations.
- **Impact**: Route files are now focused purely on endpoint validation and instantiating the correct services.

### API Configuration & Error Handling
- **`config.py`**: Changed `GOOGLE_API_KEY` from an empty string default (which failed late during LLM execution) to `Field(default=None)` or strict string typing. Added `EPHEMERAL_TOKEN_MODEL` and `EPHEMERAL_TOKEN_EXPIRY_MINUTES` to decouple token generation from hardcoded preview dates.
- **`bash_agent.py`**: Wrapped both the underlying `execute_bash_fn` and the `client.aio.models.generate_content` in explicit `try/except` blocks. Replaced hardcoded "macOS" system assumptions with dynamic `platform` variables.
- **`flash_worker.py`**: Replaced blind index accessing (`response.candidates[0].content.parts`) with safe `getattr` chains, preventing raw `IndexError` unhandled exceptions when safety blockages occur.

## 2. Frontend Architecture & IPC Security

### Deconstructing the React Monoliths
- **`App.tsx`**: Was over 500 lines handling WebRTC, IPC, and Chat logic. We deconstructed this into discrete components: `ChatArea.tsx` and `ScreenSharePanel.tsx` in `frontend/src/components/`.
- **`LandingPage.tsx`**: Was similarly bloated. We split out its distinct visual sections into `frontend/src/components/landing/*` (e.g., `HeroSection.tsx`).
- **Impact**: UI iteration is faster, file sizes are manageable, and React fast refresh behaves correctly.

### Securing Electron IPC
- **`run-bash` Execution**: Previously, the renderer UI (`BashConfirmPopup.tsx`) handled the confirmation state before sending the raw bash command to the main process, meaning a compromised renderer could bypass the modal and achieve RCE. We removed the React UI popup and migrated the confirmation entirely into the main process using a blocking, native `dialog.showMessageBox` before execution.
- **Region Selector Overlay**: We removed `nodeIntegration: true` from the display capture overlay. Instead of an unescaped `data:text/html` URI, we created a static `frontend/public/region-selector.html` loaded securely with `contextIsolation: true`.
- **State Cleanup**: Extracted the complex WebRTC desktop capture loop into a clean `useScreenSharing` custom hook to prevent memory leaks during rapid UI toggling.

## 3. Documentation & AI Agent Quality

### Upgrading the AI Guides
- **`AGENTS.md`**: Exhaustively rewritten to include specific notes on the UI architecture (`shadcn`, `framer-motion`), IPC boundary rules (specifically warning against re-adding `nodeIntegration`), `.env` requirements, and testing execution strings.
- **`CLAUDE.md`**: Simplified to act as a lightweight pointer referencing `AGENTS.md` directly.
- **Impact**: Future AI coding assistants will have near-instant comprehension of the repo's architectural boundaries and preferred tools.

### Stricter CI / Linting baselines
- **Python Type Checking**: Added `mypy` to the `pyproject.toml` dev dependencies. Fixed several minor typing loopholes (e.g., mapping dicts in `live.py` and using `collections.abc.Callable` in `ws_manager.py`). The repository now strictly passes `uv run mypy src/`.
- **Frontend Linter Fixes**: Addressed over 10 pre-existing React fast refresh warnings and hook exhaustive-dependency issues in the frontend codebase to ensure a clean `npm run lint` pipeline.

## Conclusion
The refactor was successfully applied to a clean branch originating from `main` (avoiding the `redesign` branch cross-contamination). The app's functionality remains perfectly identical, but the internal foundation is now robust, secure, and ready for advanced feature scaling.
