# BrainstormLayouts

A type-exporting component that re-exports layout components and their props for the brainstorm page. Provides the overall page layout structure.

## Key Features

- **Type Re-exports**: Re-exports `BrainstormLayoutProps` type for external use
- **Layout Components**: Exports desktop and mobile layout variants
- **Entry Point**: Acts as the main entry point for layout components

## Exports

### Types

#### BrainstormLayoutProps
Comprehensive props interface for brainstorm layouts:

| Prop | Type | Description |
|------|------|-------------|
| `intensityRef` | `MutableRefObject<number>` | Animation intensity reference |
| `isConnected` | `boolean` | Connection state |
| `isStarting` | `boolean` | Connection in progress |
| `messages` | `Message[]` | Conversation messages |
| `artifacts` | `Map<string, BrainstormArtifact>` | Generated artifacts |
| `artifactList` | `Array<[string, BrainstormArtifact]>` | Artifact array |
| `totalSize` | `number` | Total artifact size |
| `isGenerating` | `boolean` | Generation in progress |
| `inputText` | `string` | Current input text |
| `selectedArtifact` | `string \| null` | Selected artifact |
| `currentArtifact` | `BrainstormArtifact \| null` | Current preview artifact |
| `selectedFlashModel` | `BrainstormFlashModel` | Selected model |
| `selectedTools` | `BrainstormToolId[]` | Selected tools |
| `messagesEndRef` | `RefObject` | Message scroll ref |
| `setInputText` | `SetStateAction<string>` | Input setter |
| `setSelectedArtifact` | `SetStateAction<string>` | Artifact selector |
| `handleSend` | `() => void` | Send handler |
| `handleConnect` | `() => Promise<void>` | Connect handler |
| `stop` | `() => void` | Disconnect handler |

### Components

| Component | Description |
|-----------|-------------|
| `BrainstormDesktopLayout` | Desktop-optimized layout with side-by-side panels |
| `BrainstormMobileLayout` | Mobile-optimized stacked layout |

## Usage

This module is the main entry point for importing brainstorm layout components:

```typescript
import { BrainstormDesktopLayout, BrainstormMobileLayout, type BrainstormLayoutProps } from './BrainstormLayouts'
```

## Implementation

Actual layout implementations are in:
- `BrainstormDesktopLayout.tsx` - Desktop layout with AgentVisualizer, WorkspacePanel, etc.
- `BrainstormMobileLayout.tsx` - Mobile-optimized responsive layout
