# LandingPage

The main landing page of the Voidpilot application. It keeps the immersive 3D shell, section-based navigation, and the entry point into the walkthrough overlay.

## Overview

`LandingPage` is the default route (`/`). It provides:

- A full-screen Three.js background with dot-pattern overlay
- Section navigation between the index and hackathon views
- Haptic feedback for navigation interactions
- A launch point for the walkthrough overlay
- A fixed header with back navigation outside the index view

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Main landing page shell |

The page currently switches between these internal sections:

- `index` — landing cards and primary CTAs
- `hackathon` — hackathon-focused content

## Main Components Used

### Core UI Components

- **`ThreeBackground`** — animated 3D scene behind the landing content
- **`CustomCursor`** — hidden while the walkthrough overlay is open
- **`DotPattern`** — subtle visual texture over the background
- **`Button`** — header back button
- **`WalkthroughOverlay`** — transcript-first walkthrough shell using a dialog overlay

### Icons

- **`GeminiArrowLeft`** — back navigation icon
- **`GeminiLiveLogo`** — app branding in the header

### Landing Section Components

- **`IndexView`** — entry screen with mode cards
- **`HackathonSection`** — hackathon showcase section
- **`useAnimatedScroll`** — scroll controller for section transitions

## Key Features

### 1. Section Navigation

`useAnimatedScroll` drives transitions between section anchors defined in `SECTION_SCROLL_MAP`.

### 2. Haptic Feedback

`useWebHaptics` triggers tactile feedback for navigation and walkthrough launch interactions.

### 3. Walkthrough Overlay

Opening the walkthrough now renders `WalkthroughOverlay`, not the old modal component. The overlay:

- Disables the custom cursor while open
- Preserves the landing page background behind the dialog
- Provides live transcript, typed input, tool activity, and explainer panels
- Returns focus to the launcher element on close

### 4. Responsive Header

- Fixed translucent header with blur
- Back button only when `activeSection !== 'index'`
- Persistent branding

## State Management

```typescript
const [activeSection, setActiveSection] = useState<SectionId>('index')
const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)
```

`useAnimatedScroll` also exposes `progress` for the background animation and `scrollTo()` for section changes.

## Event Handlers

| Handler | Description |
|---------|-------------|
| `navigateTo(section)` | Scrolls to the mapped section and updates state |
| `goBack()` | Returns to the index view |
| `openWalkthrough()` | Opens `WalkthroughOverlay` |
| `closeWalkthrough()` | Closes `WalkthroughOverlay` |
| `triggerLight()` | Triggers light haptic feedback |

## Dependencies

- `react`
- `framer-motion`
- `web-haptics/react`
- `three` via `ThreeBackground`
- `@/components/ui/*`

## File Location

`frontend/src/pages/LandingPage.tsx`
