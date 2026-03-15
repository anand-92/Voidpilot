# Architecture

Worker-facing architecture notes for the walkthrough revamp mission.

## Mission Focus

- This mission is scoped to the landing-page `Talk to Voidpilot` walkthrough only.
- Do not redesign brainstorm flows, share pages, or unrelated backend routes unless a walkthrough change genuinely requires a coordinated fix.

## Walkthrough Request Flow

1. The landing page opens the walkthrough by toggling local overlay state.
2. The walkthrough frontend connects to the app backend over `/api/v1/live/walkthrough`.
3. The backend creates a `GeminiLive` session for realtime audio/text interaction.
4. The live session is configured with:
   - input audio transcription
   - output audio transcription
   - a single walkthrough tool: `search_project_context`
5. When Gemini Live needs project context, it emits a tool request.
6. The backend fulfills that tool by calling `search_project_context`, which uses a separate Gemini `generate_content` request backed by the configured File Search store.
7. The tool result is returned into the live session, which then continues the walkthrough response.

## Critical Accuracy Rule

- Do not describe this feature as native Gemini Live File Search.
- The accurate description is: Gemini Live realtime session over the app backend, plus a backend tool call that invokes a separate Gemini request backed by File Search.

## Walkthrough UX Invariants

- The walkthrough remains a no-sign-in landing-page overlay.
- The transcript is session-only and must clear on close/reopen.
- Starter prompts, typed fallback, and spoken turns all belong to the same live session flow.
- The transcript is the primary surface; the audio visualizer/status area is secondary.
- Off-topic prompts redirect back to Voidpilot/project help instead of turning the walkthrough into a general-purpose assistant.

## Frontend Structure Guidance

- The most relevant files are:
  - `frontend/src/components/landing/IndexView.tsx`
  - `frontend/src/pages/LandingPage.tsx`
  - `frontend/src/components/WalkthroughModal.tsx`
  - `frontend/src/hooks/useWalkthroughAgent.ts`
- Reuse the existing landing-page visual language: dark glass surfaces, amber/stone accents, and framer-motion transitions.
- Reuse existing `frontend/src/components/ui/*` primitives where possible instead of inventing custom structural markup.

## Backend Structure Guidance

- The most relevant backend files are:
  - `src/app/api/v1/endpoints/walkthrough.py`
  - `src/app/services/gemini_audio.py`
  - `src/app/services/ws_manager.py`
  - `src/app/services/file_search_service.py`
  - `src/app/services/tool_defs.py`
- Preserve the walkthrough route path and project-only system prompt semantics unless the feature explicitly requires a coordinated change.
- If backend behavior changes, add or expand walkthrough-focused pytest coverage before implementation.
