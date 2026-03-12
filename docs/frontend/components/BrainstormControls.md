# BrainstormControls

A comprehensive control panel component for the brainstorm interface. Handles user input, connection management, tool selection, and model switching.

## Key Features

- **Connection Management**: Connect/disconnect from brainstorm session
- **Message Input**: Text input for sending messages to Gemini
- **Tool Selection**: Toggle available brainstorm tools
- **Model Switching**: Switch between Flash model variants (Pro, Flash, Lite)
- **Responsive Layout**: Different layouts for mobile vs desktop

## Props

| Prop | Type | Description |
|------|------|-------------|
| `isConnected` | `boolean` | Whether session is connected |
| `isStarting` | `boolean` | Whether connection is being established |
| `selectedFlashModel` | `BrainstormFlashModel` | Currently selected Flash model |
| `setSelectedFlashModel` | `Dispatch<SetStateAction<BrainstormFlashModel>>` | Callback to change model |
| `selectedTools` | `BrainstormToolId[]` | Currently selected tool IDs |
| `setSelectedTools` | `Dispatch<SetStateAction<BrainstormToolId[]>>` | Callback to change tools |
| `inputText` | `string` | Current input text value |
| `setInputText` | `(value: string) => void` | Callback to update input |
| `handleSend` | `() => void` | Callback to send message |
| `handleConnect` | `() => Promise<void>` | Callback to connect |
| `stop` | `() => void` | Callback to disconnect |
| `layout` | `'desktop' \| 'mobile'` | Layout variant |

## Sub-components

### ToolSelector
Allows toggling brainstorm tools on/off:
- Visual button group with selected/unselected states
- Tools defined in `BRAINSTORM_TOOL_OPTIONS`

### ModelToggle
Button for cycling through Flash models:
- Shows current model label
- Cycles through Pro → Flash → Lite options
- Visual effects based on selected model

### ConnectionButton
Connect/Disconnect button:
- ShimmerButton for connect state
- PulsatingButton for active session
- Different labels for mobile/desktop

### MessageInput
Text input with send button:
- Placeholder changes based on connection state
- Send button disabled when not connected or empty
- Enter key triggers send

## Model Options

- `gemini-3.1-pro` - Blue gradient, most capable
- `gemini-3-flash` - Amber gradient, balanced
- `gemini-3.1-flash-lite` - Gray, lightweight

## Tool Options

Defined in `BRAINSTORM_TOOL_OPTIONS` from `useGeminiBrainstorm` hook:
- `save_brainstorm_artifact` - Save markdown content
- `generate_brainstorm_image` - Generate images with Veo
- `delegate_to_flash` - Delegate to Flash model

## State Management

- Tools can only be changed when not connected (`isDisabled = isConnected || isStarting`)
- Model toggling disabled during connection
- Input disabled when not connected
