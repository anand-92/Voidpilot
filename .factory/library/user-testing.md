# User Testing Guide

## Validation Surface

### Browser UI surface
- Use `agent-browser` for walkthrough browser validation.
- Always restart the backend and frontend fresh via `.factory/services.yaml` before validating the walkthrough surface.
- Load the landing page at `http://127.0.0.1:5173`, launch `Talk to Voidpilot`, and validate the overlay in place.

### Browser voice surface
- Voice-specific walkthrough validation still uses the local browser surface, but requires a headed browser session with microphone permission enabled.
- Validate user transcript, Gemini transcript, audio visualization, interruption behavior, and mid-session recovery on this surface.

### Core browser flows to validate
- Landing-page entry launches the walkthrough with no sign-in
- Transcript-first split-pane shell on desktop
- Keyboard open/close/focus behavior
- Starter prompts
- Initial typed fallback visibility
- User/Gemini transcript rendering
- Tool activity visibility for grounded project questions
- Off-topic redirect without misleading grounding activity
- Close/reopen session reset
- Narrow/mobile layout reachability
- Explainer reachability and accuracy

## Validation Concurrency

### Browser UI-only walkthrough checks
- Max concurrent validators: `5`
- Rationale:
  - this machine has ample memory/CPU headroom for several lightweight browser UI checks
  - dry-run browser validation succeeded for landing-page load and walkthrough shell launch
  - the walkthrough UI surface is much lighter than a full multi-app/Electron validation scenario

### Browser microphone-enabled walkthrough checks
- Max concurrent validators: `1`
- Rationale:
  - microphone permission and live audio observation are the practical limiting factors
  - concurrent mic-enabled walkthrough sessions would be brittle and hard to validate credibly

## Dry-Run Findings

- Dry run confirmed the validation path is executable in this environment:
  - backend health check succeeded
  - frontend loaded successfully
  - the landing page and walkthrough trigger rendered
  - the walkthrough overlay opened successfully
- Automated microphone capture failed in browser automation with `NotSupportedError`, so final live-voice verification must use a headed local browser with mic permission enabled.

## Evidence Guidance

- Capture screenshots for shell, explainer, narrow layout, and degraded/error states.
- Capture recordings for starter prompts, typed fallback, close/reopen reset, interruption, repeated grounding, and recovery flows.
- Check console errors during every browser validation run.
- When grounding behavior is relevant, capture network/websocket evidence alongside the visible UI state.

## Validator Guidance

- Keep the walkthrough session session-only. Do not expect state to persist across close/reopen.
- Validate both an on-topic project question and an off-topic question.
- Validate one path with microphone unavailable or denied.
- Validate one path where a later project question in the same session triggers a fresh grounding cycle.
- If microphone-enabled validation cannot be completed in automation, mark only the affected voice-specific assertions as blocked or defer to headed local validation; do not guess.
