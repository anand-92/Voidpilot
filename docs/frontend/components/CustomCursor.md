# CustomCursor Component

## Overview

`CustomCursor` provides a custom animated cursor that follows the mouse with smooth physics-based movement.

## Location

`/frontend/src/components/CustomCursor.tsx`

## What It Does

- Replaces the default system cursor with a custom two-part cursor
- Provides visual feedback when hovering over interactive elements
- Uses spring physics for smooth, natural movement

## Key Features

### Two-Part Cursor Design

1. **Minimal Dot** (1.5px)
   - Follows mouse position instantly
   - Amber color with glow effect
   - Hides when hovering interactive elements

2. **Subtle Ring** (28px)
   - Follows with spring physics (delayed/trailing effect)
   - Expands to 2.2x size on interactive elements
   - Border and background color change on hover

## State Management

- `isHovered`: Boolean tracking if cursor is over interactive element
- `cursorX` / `cursorY`: MotionValues for cursor position
- Spring physics: `{ damping: 30, stiffness: 300, mass: 0.4 }`

## Event Handling

**Mouse Move:**
- Tracks `clientX` and `clientY` coordinates
- Updates motion values for both cursor parts

**Mouse Over:**
- Detects hover on:
  - `<button>` elements
  - `<a>` elements
  - Elements with `closest('button')`
  - Elements with `closest('a')`
  - Elements with `closest('.group')`

## How It Renders

### Dot Cursor
```jsx
<motion.div
  className="size-1.5 rounded-full bg-amber-400"
  style={{ x: cursorX, y: cursorY }}
  animate={{ scale: isHovered ? 0 : 1, opacity: isHovered ? 0 : 0.9 }}
/>
```

### Ring Cursor
```jsx
<motion.div
  className="size-7 rounded-full border"
  style={{ x: cursorXSpring, y: cursorYSpring }}
  animate={{ 
    scale: isHovered ? 2.2 : 1,
    borderColor: isHovered ? 'rgba(217,119,6,0.5)' : 'rgba(217,119,6,0.25)',
    backgroundColor: isHovered ? 'rgba(217,119,6,0.08)' : 'rgba(217,119,6,0.02)'
  }}
/>
```

## Styling

- **Pointer events**: `none` - cursor doesn't block clicks
- **Z-index**: 100 (dot), 99 (ring) - above most content
- **Mix blend mode**: `screen` - blends with dark backgrounds
- **Box shadow**: Amber glow on dot

## Dependencies

- `react` - useEffect, useState
- `framer-motion` - motion, useMotionValue, useSpring
