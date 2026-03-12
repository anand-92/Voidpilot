# ConversationPanel

A scrollable message display component for the brainstorm conversation. Renders chat messages in a styled container with an empty state when no messages exist.

## Key Features

- **Message Display**: Renders a list of messages using the `MessageBubble` component
- **Scroll Management**: Uses `ScrollArea` for smooth scrolling and auto-scrolls to the latest message via `messagesEndRef`
- **Empty State**: Displays a styled placeholder when no messages have been sent
- **Message Count Badge**: Shows the total number of messages in the conversation
- **Responsive Layout**: Adapts styling for mobile vs desktop layouts

## Props

| Prop | Type | Description |
|------|------|-------------|
| `messages` | `Message[]` | Array of message objects to display |
| `messagesEndRef` | `RefObject<HTMLDivElement | null>` | Reference for auto-scrolling to bottom |
| `mobile` | `boolean` | Whether to render in mobile layout mode |

## Message Types

The component renders messages from the `useGeminiLive` hook's message format:
- User messages
- Assistant messages  
- Tool responses (marked with `isToolResponse` flag)

## Empty State

When `messages.length === 0`, displays:
- Dot pattern background
- Brainstorm icon
- "Ready to brainstorm" text with contextual description

## Styling

- Uses `DotPattern` for background texture
- Implements border separators for visual hierarchy
- Message badges show message count with uppercase tracking
- Mobile layout includes border separators; desktop uses transparent headers
