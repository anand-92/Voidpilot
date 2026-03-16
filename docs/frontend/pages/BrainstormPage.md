# BrainstormPage

The main brainstorm workspace route. It coordinates auth/guest entry, mode selection, persistent session loading, and the responsive layouts for both Open Studio and Creative Spark.

## Overview

`BrainstormPage` powers the `/brainstorm` route and provides:

- Brainstorm entry/auth flow
- Mode selection between Open Studio and Creative Spark
- Guest and signed-in workspace access
- Persistent session creation, reopening, restart, and deletion
- Share-link creation for persisted sessions
- Responsive desktop/mobile layouts matched to the active brainstorm mode

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/brainstorm` | `BrainstormPage` | Brainstorm workspace shell |

The page uses the websocket endpoint `WS /api/v1/live/brainstorm` plus REST helpers for persisted session and sharing flows.

## Main Dependencies

### Hooks

- `useGeminiBrainstorm` — live brainstorm transport, transcript, artifacts, voice, mute, and session workspace state
- `useBrainstormEntryAuth` — brainstorm-specific auth state and sign-in helpers
- `useBrainstormSessionLibrary` — persisted session library actions

### Components

- `BrainstormEntryModal`
- `ModeSelectionScreen`
- `BrainstormDesktopLayout`
- `BrainstormMobileLayout`
- `CreativeSparkDesktopLayout`
- `CreativeSparkMobileLayout`

### Utilities / APIs

- `getArtifactSize`
- `createBrainstormShare`

## Core Flow

### 1. Entry and Access Control

The page starts behind `BrainstormEntryModal` unless the user has either:

- guest access for an ephemeral session, or
- signed-in workspace access tied to the current auth change key

### 2. Mode Selection

Before starting a new workspace, the user selects a `BrainstormType`:

- `open_studio`
- `creative_spark`

For signed-in users, session creation is deferred until after this choice so the persisted record can be created with the correct mode.

### 3. Persisted Session Resume / Restart

When reopening a saved session, the page restores the stored `brainstormType` and bypasses mode selection. When switching modes inside a persisted session, it can restart the workspace while preserving the session identity.

### 4. Layout Selection

The page detects mobile layouts with media query, touch-point, and user-agent heuristics, then renders one of four layouts:

- `BrainstormDesktopLayout`
- `BrainstormMobileLayout`
- `CreativeSparkDesktopLayout`
- `CreativeSparkMobileLayout`

## State Management

### Local Page State

```typescript
const [inputText, setInputText] = useState('')
const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
const [isMobileLayout, setIsMobileLayout] = useState(false)
const [hasGuestAccess, setHasGuestAccess] = useState(false)
const [grantedSignedInAuthChangeKey, setGrantedSignedInAuthChangeKey] = useState<number | null>(null)
const [showModeSelection, setShowModeSelection] = useState(false)
const [pendingNewSession, setPendingNewSession] = useState(false)
const messagesEndRef = useRef<HTMLDivElement>(null)
```

### Hook-Provided State Highlights

`useGeminiBrainstorm` exposes the active session and workspace state, including:

- connection state
- transcript/messages
- `toolActivityEntries`
- artifact map and lazy load state
- `activeSessionId`, `sessionMode`, `sessionTitle`
- `brainstormType`
- selected Flash model, selected voice, selected tools
- mute controls and auto-start error handling

## Shared Layout Props

The page builds a `BrainstormLayoutProps` object that includes both legacy workspace props and newer mode/session fields such as:

- `brainstormType`
- `toolActivityEntries`
- `selectedArtifactLoadState`
- `sessionTitle`
- `selectedVoice`
- `isMuted`
- `toggleMute`
- `onCreateShare`
- `autoStartError`
- `onGoBack`

## Key Handlers

| Handler | Description |
|---------|-------------|
| `handleContinueAsGuest()` | Grants guest access and opens mode selection |
| `handleCreateSession()` | Grants signed-in workspace access and defers session creation until mode pick |
| `handleReopenSession(sessionId)` | Restores an existing persisted workspace |
| `handleDeleteSession(sessionId)` | Deletes a stored brainstorm session |
| `handleSelectMode(mode)` | Creates/restarts workspace in the selected mode |
| `handleGoBackToModeSelection()` | Stops the current session and returns to the mode picker |
| `handleCreateShare()` | Creates a public share link for the active persisted session |
| `handleSend()` | Sends typed text into the brainstorm session |
| `handleConnect()` | Starts the live brainstorm session |

## Auto-Scroll

The transcript view scrolls to the latest message whenever `messages` changes.

## Related Files

- `frontend/src/pages/BrainstormPage.tsx`
- `frontend/src/components/brainstorm/BrainstormLayouts.tsx`
- `frontend/src/components/brainstorm/ModeSelectionScreen.tsx`
- `frontend/src/components/brainstorm/BrainstormEntryModal.tsx`
- `frontend/src/hooks/useGeminiBrainstorm.ts`
- `frontend/src/hooks/useBrainstormSessionLibrary.ts`
- `frontend/src/hooks/useBrainstormEntryAuth.ts`
