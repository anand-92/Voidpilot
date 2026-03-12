# LandingPage

The main landing page of the Voidpilot application, serving as the entry point for users. It features an immersive 3D background, animated sections, and navigation to different app modes.

## Overview

LandingPage is the default route (`/`) of the application. It provides:
- An immersive 3D animated background using Three.js
- Section-based navigation with smooth scrolling
- Access to the main voice assistant (Live mode)
- Access to the Walkthrough mode for voice-guided exploration
- Information about capabilities and hackathon features

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Main landing page (default route) |

The page uses internal state-based routing to switch between different sections:
- `index` - Initial landing view with navigation options
- `hero` - Main Live assistant launch section
- `capabilities` - Features and capabilities showcase
- `hackathon` - Hackathon-specific information

## Main Components Used

### Core UI Components
- **`ThreeBackground`** - 3D animated background using Three.js
- **`CustomCursor`** - Custom cursor component (disabled when Walkthrough modal is open)
- **`DotPattern`** - Decorative background pattern
- **`Button`** - shadcn/ui button component
- **`WalkthroughModal`** - Modal for voice-guided walkthrough mode

### Icons
- **`GeminiArrowLeft`** - Back navigation icon
- **`GeminiLiveLogo`** - Application logo

### Landing Section Components
- **`IndexView`** - Initial landing view with navigation buttons
- **`HeroSection`** - Main hero section with Live assistant launch
- **`CapabilitiesSection`** - Showcase of app capabilities
- **`HackathonSection`** - Hackathon-specific features section
- **`useAnimatedScroll`** - Hook for animated scroll behavior

## Key Features

### 1. Section Navigation
The page uses `useAnimatedScroll` hook to provide smooth scrolling between sections. The `SECTION_SCROLL_MAP` constant defines scroll positions for each section.

### 2. Haptic Feedback
Uses `useWebHaptics` from `web-haptics/react` to provide tactile feedback on user interactions (selection, light, success).

### 3. Walkthrough Mode
Users can open the WalkthroughModal to access voice-guided exploration mode. When open:
- Custom cursor is disabled
- 3D background remains visible
- Modal provides voice interaction interface

### 4. Responsive Header
- Fixed header with blur effect
- Back button appears when not on index section
- Logo always visible

## State Management

### Local State
```typescript
const [activeSection, setActiveSection] = useState<SectionId>('index')
const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)
```

### Scroll Progress
The `useAnimatedScroll` hook provides scroll progress for the 3D background animation.

## Event Handlers

| Handler | Description |
|---------|-------------|
| `navigateTo(section)` | Navigates to a specific section with haptic feedback |
| `goBack()` | Returns to index section |
| `openWalkthrough()` | Opens the WalkthroughModal |
| `closeWalkthrough()` | Closes the WalkthroughModal |
| `triggerSuccess()` | Triggers success haptic feedback |
| `triggerLight()` | Triggers light haptic feedback |

## Styling

- **Font**: Sans-serif with `stone-100` text color
- **Background**: Black with 3D animated background
- **Selection**: Amber color (`amber-500/30`)
- **Header**: Semi-transparent with backdrop blur
- **Animations**: Framer Motion for smooth transitions

## Dependencies

- `framer-motion` - Animations
- `web-haptics/react` - Haptic feedback
- `react` - Core React library
- `three` - 3D graphics (via ThreeBackground)
- `@/components/ui` - shadcn/ui components

## File Location

`/Users/nikhilanand/gemini-live-3d-bridge/frontend/src/pages/LandingPage.tsx`
