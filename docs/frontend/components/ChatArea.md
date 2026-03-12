# ChatArea Component

## Overview

`ChatArea` is the main chat interface component for the live assistant mode. It handles displaying conversation messages, user input, and connection status.

## Location

`/frontend/src/components/ChatArea.tsx`

## What It Does

- Renders a scrollable message area displaying conversation history
- Provides a text input field for sending messages
- Shows connection status via visual indicators (BorderBeam animation)
- Displays message count badge
- Handles empty state when no messages exist

## Key Props

| Prop | Type | Description |
|------|------|-------------|
| `isConnected` | `boolean` | Whether the WebSocket connection is active |
| `messages` | `Message[]` | Array of chat messages to display |
| `messagesEndRef` | `RefObject<HTMLDivElement>` | Reference for auto-scrolling to bottom |
| `inputText` | `string` | Current input text value |
| `setInputText` | `(text: string) => void` | Callback to update input text |
| `handleSend` | `() => void` | Callback to send message |

## State Management

- Uses local state via `inputText` prop (controlled by parent)
- Auto-scrolls to messages end via `messagesEndRef`

## How It Renders the UI

### Header Section
- Displays Gemini chat icon (`GeminiChat`)
- "Conversation" title label
- Message count badge showing total messages

### Message Area
- Uses `ScrollArea` component for scrollable container
- **Empty state**: Shows star icon and placeholder text when no messages
- **With messages**: Maps through `messages` array, rendering each as a `MessageBubble` with `BlurFade` animation

### Input Section
- "Quick prompt" label with checkmark icon
- Text input with placeholder "Type a message..." or "Connect first to chat" (disabled when not connected)
- Send button with tooltip, disabled when disconnected or input empty
- Amber/gold color scheme for visual consistency

## Dependencies

- `@/components/ui/badge` - Badge for status/count
- `@/components/ui/button` - Send button
- `@/components/ui/input` - Message input
- `@/components/ui/scroll-area` - Scrollable message area
- `@/components/ui/tooltip` - Button tooltip
- `@/components/ui/border-beam` - Connection animation
- `@/components/ui/blur-fade` - Message fade-in animation
- `./SharedUI` - `MessageBubble` component
- `./icons/GeminiIcons` - Gemini-themed icons
