# Frontend Knowledge

Mission-specific frontend guidance for the walkthrough revamp.

## Relevant UI Building Blocks

- Existing walkthrough entry and shell files:
  - `frontend/src/components/landing/IndexView.tsx`
  - `frontend/src/pages/LandingPage.tsx`
  - `frontend/src/components/walkthrough/WalkthroughOverlay.tsx` (main overlay shell)
  - `frontend/src/components/walkthrough/WalkthroughTranscript.tsx`
  - `frontend/src/components/walkthrough/WalkthroughComposer.tsx`
  - `frontend/src/components/walkthrough/WalkthroughStarterPrompts.tsx`
  - `frontend/src/components/walkthrough/WalkthroughExplainer.tsx`
  - `frontend/src/hooks/useWalkthroughAgent.ts`
  - `frontend/src/types/walkthrough.ts` (discriminated-union types for all walkthrough events and state)
- Existing reusable UI primitives in `frontend/src/components/ui/` that are likely useful here:
  - `button.tsx`
  - `badge.tsx`
  - `input.tsx`
  - `scroll-area.tsx`
  - `separator.tsx`
  - `tabs.tsx`
  - `alert.tsx`
  - `magic-card.tsx`
  - `shine-border.tsx`
  - `particles.tsx`
  - `dot-pattern.tsx`

## UI Direction

- Match the existing landing-page visual language: dark glass surfaces, soft borders, amber/stone accents, and restrained motion.
- The transcript is the primary pane. The voice visualizer is supporting context.
- Prefer structural composition with existing UI primitives over large custom wrappers.

## Frontend Conventions

- Use `motion.div`, `motion.span`, etc. directly. Do not use `motion.create()` inside render cycles.
- Use inline type modifiers for type-only imports when needed.
- Prefer `??` over `||` for defaults.
- Do not use eslint-disable comments.

## Walkthrough-Specific UX Notes

- Starter prompts and typed fallback should be immediately visible from the shell, not hidden behind a failure state.
- The explainer must remain reachable even after the conversation is active and on narrow layouts.
- Closing the overlay must visually clear transcript/tool state and return the landing page to a normal interactive state.
