# WalkthroughModal Component

## Overview

`WalkthroughModal` is a full-screen modal component for the voice-guided walkthrough mode. It provides an immersive audio visualization experience.

## Location

`/frontend/src/components/WalkthroughModal.tsx`

## What It Does

- Displays a full-screen modal with animated audio visualizations
- Shows connection status (Connecting, Live, Disconnected)
- Renders real-time audio intensity meters for input/output
- Provides visual feedback through animated rings and orbs
- Handles escape key to close and cleanup on unmount

## Key Props

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Whether the modal is visible |
| `onClose` | `() => void` | Callback to close the modal |

## Internal State

- Uses `useWalkthroughAgent` hook for WebSocket connection management
- Canvas ref for custom 2D audio visualization
- Animation frame ref for render loop

## How It Renders the UI

### Container
- Fixed full-screen overlay with `bg-stone-950/95` and `backdrop-blur-2xl`
- Uses `AnimatePresence` for entrance/exit animations (300ms fade)
- Particles background with amber-colored particles

### Header Area
- Close button (top-right) with X icon
- Status indicator badge showing connection state

### Main Visual (Canvas)
- **Central orb**: Radial gradient that pulses based on `visualIntensityRef`
- **Animated rings**: 5 concentric rings that pulse and breathe based on audio intensity
- **Audio meters**: Two vertical bars showing input/output intensity
  - Left meter: "You" - user's microphone input
  - Right meter: "Gemini" - assistant's audio output

### Footer
- Instructional text: "Speak naturally — left meter is you, right meter is Gemini"

## Audio Visualization Details

The canvas renders at 60fps using `requestAnimationFrame`:
- Orb radius: 30-70px based on intensity
- Ring radii: 40-165px with alpha fade
- Meter heights: Dynamic based on audio intensity
- Smooth animations using sine waves for breathing effects

## Dependencies

- `react` - useCallback, useEffect, useRef
- `framer-motion` - AnimatePresence, motion for animations
- `lucide-react` - XIcon
- `@/components/ui/button` - Close button
- `@/components/ui/badge` - Status badges
- `@/components/ui/shine-border` - Orb border effect
- `@/components/ui/particles` - Background particles
- `../hooks/useWalkthroughAgent` - WebSocket connection hook
