# SharedUI Components

## Overview

`SharedUI.tsx` contains reusable UI components for chat messages and status indicators used across the application.

## Location

`/frontend/src/components/SharedUI.tsx`

## Components

### 1. PulseRing

A pulsing ring indicator for live status.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `active` | `boolean` | Whether to show the pulsing animation |

**Rendering:**
- Returns `null` if not active
- Uses CSS `animate-ping` for the pulse effect
- Amber color (`bg-amber-400`)

---

### 2. StatusChip

A status badge showing connection state.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `isConnected` | `boolean` | Whether connected to the assistant |
| `isStarting` | `boolean` | Whether the connection is starting |

**States:**
- **Live** (connected): Amber styling, includes `PulseRing`
- **Starting**: Orange styling
- **Offline**: Gray/stone styling

**Styling:**
- Rounded full badge with `uppercase` text
- Gap for the pulse indicator

---

### 3. MessageBubble

The main message display component for chat.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `role` | `string` | Message role: "user", "model", "gemini", "system" |
| `content` | `string` | Message content (plain text or markdown) |
| `isToolResponse` | `boolean` | Whether this is a tool execution result |

**Role-Based Styling:**

| Role | Bubble Style | Label | Markdown |
|------|--------------|-------|----------|
| `user` | Amber background | "You" | No |
| `model` / `gemini` | Stone with border | "Gemini" | Yes |
| `system` | White tinted | "System" | No |
| `default` | Falls back to model | "Gemini" | Yes |

**Rendering:**
- Wrapped in `BlurFade` animation
- User messages: right-aligned
- Other messages: left-aligned
- Max-width: 90% (mobile), 80% (desktop)
- Markdown rendering via `react-markdown` for model responses
- Tool responses: rainbow border effect

---

## Helper Definitions

### MESSAGE_STYLES

Object mapping roles to their styling configurations:
- `bubble`: CSS classes for bubble appearance
- `label`: CSS classes for the name label
- `name`: Display name
- `isMarkdown`: Whether to render as markdown

### LABEL_CLASSES

Shared label styling: `mb-1 text-[10px] font-bold uppercase tracking-[0.2em]`

## Dependencies

- `@/components/ui/badge` - Badge component
- `@/components/ui/blur-fade` - Fade animation
- `@/lib/utils` - `cn` utility for className merging
- `react-markdown` - Markdown rendering
