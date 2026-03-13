# BrainstormPage

A creative workspace for generating multimedia content using Gemini's brainstorming capabilities. Users can generate artifacts (markdown), images (Veo), and delegate tasks to Flash model.

## Overview

BrainstormPage is the brainstorming workspace route (`/brainstorm`) of the application. It provides:
- WebSocket connection to the brainstorm backend endpoint
- Real-time messaging with Gemini
- Artifact management (save, view, download)
- Image generation via Veo
- Flash model delegation
- Responsive layout (desktop/mobile)

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/brainstorm` | `BrainstormPage` | Creative workspace for brainstorming |

The page connects to the WebSocket endpoint: `WS /api/v1/live/brainstorm`

## Main Components Used

### Layout Components
- **`BrainstormDesktopLayout`** - Desktop-optimized layout with sidebar and workspace
- **`BrainstormMobileLayout`** - Mobile-optimized layout with touch-friendly controls

Both layouts share common props via `BrainstormLayoutProps` type.

### Hooks
- **`useGeminiBrainstorm`** - Primary hook for brainstorm WebSocket transport and artifact management

### Utilities
- **`getArtifactSize`** - Calculates the total size of artifacts for storage tracking

## Key Features

### 1. WebSocket Connection
The page uses `useGeminiBrainstorm` hook to manage:
- Connection state (`isConnected`, `isStarting`)
- Messaging (`messages`, `sendText`)
- Artifact management (`artifacts`, `selectedArtifact`)
- Generation state (`isGenerating`)

### 2. Responsive Layout
Automatically detects mobile devices using:
- Media query: `(max-width: 767px), (pointer: coarse) and (max-width: 1024px)`
- Touch point detection
- User agent detection (Android, iOS, etc.)

### 3. Artifact Management
- List all artifacts with their sizes
- Select artifacts to view details
- Download artifacts
- Track total storage used

### 4. Flash Model Selection
- Select between different Flash models
- Model selection persisted in state

### 5. Tool Selection
- Choose which tools are available:
  - `save_brainstorm_artifact` - Save markdown artifacts
  - `generate_brainstorm_image` - Generate images via Veo
  - `delegate_to_flash` - Delegate to Flash model

### 6. Session Persistence & Library
- **Library View**: Browse previously saved brainstorm sessions (signed-in users only)
- **Persistent Session Loading**: Restore transcript and artifact list from Firestore/Cloud Storage
- **Automatic Turn Saving**: Conversations are saved after each interaction
- **Sharing UI**: Generate and manage public read-only share links for sessions

### 7. Guest vs. Signed-in Mode
- **Guest Mode**: Ephemeral sessions for unauthenticated users
- **Signed-in Mode**: Persistent sessions with full library and sharing support
- **Onboarding Flow**: Encourages signing in for persistent storage and sharing

## State Management

### Local State
```typescript
const [inputText, setInputText] = useState('')           // User input
const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)  // Selected artifact ID
const [isMobileLayout, setIsMobileLayout] = useState(false)  // Layout mode
const [sessionTitle, setSessionTitle] = useState('New Brainstorm') // Session title
const [isLibraryOpen, setIsLibraryOpen] = useState(false) // Library view toggle
const messagesEndRef = useRef<HTMLDivElement>(null)      // Auto-scroll ref
```

### Hook State (useGeminiBrainstorm)
```typescript
{
  isConnected: boolean           // WebSocket connection status
  isStarting: boolean           // Connection in progress
  messages: Message[]           // Chat messages
  artifacts: Map<string, Artifact>  // Saved artifacts
  isGenerating: boolean         // Generation in progress
  intensityRef: React.RefObject // Animation intensity
  selectedFlashModel: string    // Currently selected Flash model
  selectedTools: string[]       // Enabled tools
}
```

## Shared Props (BrainstormLayoutProps)

The page constructs a shared props object passed to both desktop and mobile layouts:

```typescript
const sharedProps: BrainstormLayoutProps = {
  intensityRef,
  isConnected,
  isStarting,
  messages,
  artifacts,
  artifactList,
  totalSize,
  isGenerating,
  inputText,
  selectedArtifact,
  currentArtifact,
  selectedFlashModel,
  setSelectedFlashModel,
  selectedTools,
  setSelectedTools,
  messagesEndRef,
  setInputText,
  setSelectedArtifact,
  handleSend,
  handleConnect,
  stop,
}
```

## Event Handlers

| Handler | Description |
|---------|-------------|
| `handleSend()` | Sends user input text to the WebSocket |
| `handleConnect()` | Initiates WebSocket connection |
| `stop()` | Stops the current generation (from hook) |

## Auto-Scroll Behavior

The chat automatically scrolls to the latest message using:
```typescript
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

## Styling

- Uses component-specific styles from BrainstormLayouts
- Responsive design adapts to viewport size
- Mobile-first approach for touch devices

## Dependencies

- `react` - Core React library
- `@/hooks/useGeminiBrainstorm` - Custom hook for brainstorm functionality
- `@/components/brainstorm/*` - Brainstorm-specific components

## File Location

`/Users/nikhilanand/gemini-live-3d-bridge/frontend/src/pages/BrainstormPage.tsx`

## Related Files

- `src/hooks/useGeminiBrainstorm.ts` - WebSocket and artifact management hook
- `src/components/brainstorm/BrainstormLayouts.tsx` - Desktop and mobile layouts
- `src/components/brainstorm/utils.ts` - Utility functions for artifact management
