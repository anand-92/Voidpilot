# Walkthrough UI Shell

## Overview

The old `WalkthroughModal` component has been replaced by a richer walkthrough UI built around `WalkthroughOverlay` and its sibling components in `frontend/src/components/walkthrough/`.

## Current Entry Point

`frontend/src/components/walkthrough/WalkthroughOverlay.tsx`

## What the Current Walkthrough UI Does

- Renders a dialog-based overlay on top of the landing page
- Shows connection status, mic state, and error/degraded states
- Lets users start the walkthrough, select a voice, and stop/retry sessions
- Displays a transcript-first conversation view
- Supports typed follow-up questions in the same live session
- Shows inline project-grounding activity for `search_project_context`
- Includes a collapsible explainer describing the File Search-backed flow

## Main Walkthrough Components

| Component | Purpose |
|-----------|---------|
| `WalkthroughOverlay.tsx` | Main responsive overlay shell |
| `WalkthroughTranscript.tsx` | Transcript list with speech turns and inline tool activity |
| `WalkthroughComposer.tsx` | Typed input composer for walkthrough questions |
| `WalkthroughStarterPrompts.tsx` | Suggested prompts before the session starts |
| `WalkthroughExplainer.tsx` | Explains the backend-mediated Gemini Live + File Search flow |

## State + Data Flow

- `WalkthroughOverlay` consumes `useWalkthroughAgent`
- `useWalkthroughAgent` manages websocket/audio state, transcript state, tool activity, and voice selection
- The overlay returns focus to the triggering launcher when closed

## Visual Structure

### Header

- Close button
- Live status badge
- Voice selector
- Start/stop controls

### Main Content

- Transcript panel for user/Gemini turns and tool activity
- Mini audio visualizer driven by input/output intensity refs
- Composer for typed follow-up questions
- Starter prompts before the first session begins

### Side / Secondary Panel

- Collapsible `WalkthroughExplainer`
- Helpful context about how project grounding works

## Related Files

- `frontend/src/components/walkthrough/WalkthroughOverlay.tsx`
- `frontend/src/components/walkthrough/WalkthroughTranscript.tsx`
- `frontend/src/components/walkthrough/WalkthroughComposer.tsx`
- `frontend/src/components/walkthrough/WalkthroughStarterPrompts.tsx`
- `frontend/src/components/walkthrough/WalkthroughExplainer.tsx`
- `frontend/src/hooks/useWalkthroughAgent.ts`
