# ThreeBackground Component

## Overview

`ThreeBackground` is a 3D animated background using Three.js. It creates an immersive visual experience with an animated geometric core and grid floor.

## Location

`/frontend/src/components/ThreeBackground.tsx`

## What It Does

- Renders a full-screen 3D scene with Three.js
- Creates an animated geometric core (icosahedron) with wireframe cage
- Renders a perspective grid floor with custom shader effects
- Responds to scroll progress to move the camera through waypoints
- Responds to mouse movement for subtle parallax effects

## Key Props

| Prop | Type | Description |
|------|------|-------------|
| `scrollProgress` | `number` | 0.0 to 2.0 continuous value representing scroll position |

## Scroll-Based Camera Waypoints

The camera interpolates between three waypoints based on scroll:

| Section | Scroll Range | Camera Position | Core Rotation |
|---------|--------------|-----------------|---------------|
| Hero | 0.0-1.0 | (0, 0, 8) | 0° |
| Capabilities | 1.0-2.0 | (-3, 1.5, 4) | 90° |
| Hackathon | 2.0+ | (2, -1, 1) | 180° |

## 3D Scene Elements

### Core Group
- **Icosahedron Mesh**: Blue metallic sphere with transmission effect
  - Geometry: `IcosahedronGeometry(1.5, 1)`
  - Material: Physical material with blue emissive glow
- **Wireframe Cage**: Lavender wireframe surrounding core
  - Geometry: `IcosahedronGeometry(1.8, 1)`
  - Blending: Additive for glow effect

### Lighting
- **Ambient Light**: White, intensity 0.7
- **Point Light 1**: Sky blue (#38bdf8), positioned at (5, 5, 5)
- **Point Light 2**: Purple (#818cf8), positioned at (-5, -5, 2)
- **Core Light**: Sky blue, makes core appear self-illuminating

### Grid Floor
- Custom shader material with animated noise
- Blue-to-purple gradient based on depth
- Grid lines with distance-based fade

## Animation Loop

The render loop runs at 60fps with:

1. **Core Rotation**: Continuous Y/X rotation
2. **Cage Counter-rotation**: Opposite direction
3. **Mouse Drift**: Subtle position drift based on mouse and time
4. **Camera Interpolation**: Smooth lerp to target waypoint
5. **Shader Time Update**: Grid animation uniform

## Mouse Interaction

- Tracks mouse position relative to viewport center
- Applies parallax effect to core group position
- Mouse X/Y influence camera position offsets

## Responsive Handling

- Listens to `resize` event
- Updates camera aspect ratio
- Updates renderer size
- Tracks half-width/half-height for mouse calculations

## Performance Optimizations

- Uses `requestAnimationFrame` for render loop
- Pixel ratio capped at 2
- Renderer set to `alpha: true` for transparency
- Fog for depth perception and distant object culling

## Dependencies

- `react` - useEffect, useRef
- `three` - THREE.js library

## Styling

- Fixed positioning, full viewport coverage
- `pointer-events: none` - allows clicks to pass through
- Z-index: 0 - behind all content
