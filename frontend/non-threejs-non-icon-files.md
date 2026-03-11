# Non-Three.js, Non-Icon Source Files

| File | Purpose |
|------|---------|
| `src/main.tsx` | App entry, runtime-dependent router |
| `src/App.tsx` | Desktop live UI |
| `src/electron-env.d.ts` | Electron type declarations |
| `src/pages/BrainstormPage.tsx` | Brainstorm workspace & ZIP export |
| `src/pages/LandingPage.tsx` | Web landing page |
| `src/hooks/useGeminiLive.ts` | Primary live transport hook |
| `src/hooks/useGeminiBrainstorm.ts` | Brainstorm websocket hook |
| `src/hooks/useWalkthroughAgent.ts` | Walkthrough mode hook |
| `src/components/SharedUI.tsx` | Shared UI components |
| `src/components/CustomCursor.tsx` | Custom cursor component |
| `src/components/WalkthroughModal.tsx` | Walkthrough voice modal |
| `src/components/brainstorm/BrainstormLayouts.tsx` | Shared layout props & responsive wrapper |
| `src/components/brainstorm/BrainstormDesktopLayout.tsx` | Desktop brainstorm layout |
| `src/components/brainstorm/BrainstormMobileLayout.tsx` | Mobile brainstorm layout with tab navigation |
| `src/components/brainstorm/BrainstormControls.tsx` | Connection, model selector & input controls |
| `src/components/brainstorm/ConversationPanel.tsx` | Chat message list & transcript display |
| `src/components/brainstorm/WorkspacePanel.tsx` | Artifact list, preview & ZIP export |
| `src/components/brainstorm/ArtifactRow.tsx` | Single artifact row with download action |
| `src/components/brainstorm/ArtifactPreview.tsx` | Markdown/image artifact preview |
| `src/components/brainstorm/ActivitySpinner.tsx` | Inline activity/loading indicator |
| `src/components/brainstorm/utils.ts` | File-size formatting, download & ZIP helpers |
| `src/utils/audio.ts` | Audio playback/capture utilities |
