# Hackathon Ideas

## Android Emulator Agent

Voice-controlled AI agent that interacts with an Android emulator using Gemini Live + MCP.

### Concept
- Gemini Live watches the emulator screen via vision
- User talks to the agent naturally ("open Instagram", "swipe right on this profile", "send a message to John")
- MCP tools control the emulator (tap, swipe, type, install APK, etc.)
- Agent executes actions in real-time based on voice commands

### Category
**UI Navigator** ☸️ - Visual UI Understanding & Interaction

### Core Principle
**Voice + Vision + Tool Calling = Real Agent**
(Voice-only = Fancy Chatbot 💀)

MCP/tool-calling is essential - the agent must DO things, not just talk.

### Why it works
- Vision + voice + tool calling = actual agent, not just a chatbot
- Infinite demo potential - do anything a phone can do
- Self-contained (no real device needed)
- Your sister can craft fun voice commands / scenarios

### MCP Tools Needed
- `emulator_tap(x, y)` - tap at coordinates
- `emulator_swipe(x1, y1, x2, y2, duration)` - swipe gesture
- `emulator_type(text)` - keyboard input
- `emulator_screenshot()` - get current screen (for vision)
- `emulator_launch_app(package_name)` - open app
- `emulator_install_apk(path)` - install apps
- `emulator_get_screen_info()` - screen dimensions

### Existing Resources
- Leverage logic from: claude android emulator agent project

### Demo Scenarios
1. "Set up my phone" → agent opens Play Store, installs apps, configures settings
2. "Open Tinder and swipe right 10 times"
3. "Send a WhatsApp message to my sister"
4. "Take a selfie and describe what you see"

---

## Tech Stack Options

### Google ADK (Recommended)
- Native **MCP integration** via `McpToolset`
- Built-in **multi-agent orchestration** (SequentialAgent, ParallelAgent)
- **Gemini Live API** streaming support
- **Parallel function calling** - multiple MCP tools run simultaneously

### Alternative: LiveKit Agents
- Has Gemini Live API plugin
- Handles WebRTC for you
- Good if you want less backend complexity

---

## New Ideas

### 1. Multi-Agent Phone Assistant (ADK + Emulator)

Build on the Android Emulator idea but with **multiple specialized agents**:

- **Vision Agent** - analyzes screen content
- **Action Agent** - executes emulator controls
- **Planning Agent** - breaks down complex tasks

User: "Set up my ideal productivity phone"
→ Planning agent breaks it down
→ Vision agent confirms each screen
→ Action agent installs apps, configures settings in parallel

### 2. Smart Home Agent

Voice-controlled home assistant using Gemini Live + MCP:

- **Vision** - show it your living room, point at devices
- **MCP** - controls smart home APIs (Tuya, Home Assistant, etc.)
- "Hey, dim the lights and play jazz"
- "This thermostat is too confusing, configure it for me"

**Category**: Live Agent
**Demo**: Point camera at random device, "make this work"

### 3. AI Shopping Assistant

Physical product + voice:

- Show product to camera → agent finds it, compares prices
- "Find me something like this but cheaper"
- MCP tools for: Amazon API, price comparison, wishlist

**Category**: UI Navigator
**Demo**: Hold up random object, "is this a good deal?"

---

## Other Ideas (discarded)

- Desktop App Agent (Blender/Unity MCP) - cool but less demo-friendly
- Voice Travel Planner - too generic
- AI Interview Coach - mid
