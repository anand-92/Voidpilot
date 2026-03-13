# AgentVisualizer

A canvas-based animated visualization component that renders two animated pixel-art agents (Gemini and Flash) in a virtual office environment. The component creates an interactive, living workspace that reflects the current state of the brainstorm session.

## Key Features

- **Dual Agent Rendering**: Displays two distinct pixel agents (Gemini and Flash) that respond to session state changes
- **Animation System**: Uses sprite-based animation with multiple animation states (idle, walk, hide, hidden)
- **Speech Bubbles**: Agents display contextual speech bubbles with dialogue based on their active/idle state
- **Collision Detection**: Implements AABB vs circle collision for agent movement and furniture interaction
- **Z-Sorted Rendering**: Properly sorts furniture and agents by Y-position for correct depth perception

## Props

| Prop | Type | Description |
|------|------|-------------|
| `intensityRef` | `React.MutableRefObject<number>` | Reference to control animation intensity |
| `isGenerating` | `boolean` | Whether Flash agent is actively generating content |
| `isConnected` | `boolean` | Whether the session is connected (affects Gemini agent) |
| `className` | `string` (optional) | Additional CSS classes |
| `style` | `React.CSSProperties` (optional) | Additional inline styles |

## State

The component maintains internal state for:
- Agent positions (x, y), targets (targetX, targetY), and facing direction
- Animation frame and timer for each agent
- Speech bubble text and timer
- Furniture positions and sprites
- Canvas rendering state

## Agent Behavior

- **Gemini Agent**: Yellow-colored "Voice" agent that becomes active when `isConnected` is true
- **Flash Agent**: Blue-colored "Worker" agent that becomes active when `isGenerating` is true
- **Idle Wandering**: When agents are not actively "working", they wander to random target tiles within the office environment every 3-8 seconds
- **Dialogue System**: Agents display different dialogue based on active/idle state with randomized timing
- **Movement**: Agents walk to their target positions when active/wandering, then switch to the appropriate animation state (working/idle)

## Animation Definitions

| Animation | Row | Frames | Speed |
|-----------|-----|--------|-------|
| idle | 0 | 4 | 0.35 |
| walk | 1 | 8 | 0.12 |
| hide | 2 | 15 | 0.08 |
| hidden | 3 | 4 | 0.3 |

## Dependencies

- Uses `pixelOffice` spritesheet and utilities for rendering
- Requires `/assets/sneaky-toast-clean.png` spritesheet image
- Uses `getCachedSprite` from spriteCache for furniture rendering
