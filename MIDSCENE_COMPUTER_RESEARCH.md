# @midscene/computer — Comprehensive Research Report

> **Date**: March 7, 2026  
> **Package**: `@midscene/computer` (latest: v1.4.9)  
> **Repository**: [github.com/web-infra-dev/midscene](https://github.com/web-infra-dev/midscene) (8,800+ ⭐)  
> **License**: MIT  
> **Docs**: [midscenejs.com](https://midscenejs.com)

---

## 1. Package Overview & Architecture

`@midscene/computer` is the **PC desktop automation** package from the Midscene.js ecosystem — an AI-powered, vision-driven UI automation platform by ByteDance's web-infra-dev team.

### Core Architecture
- **Pure Vision Approach**: Since v1.0, Midscene exclusively uses screenshot-based visual understanding (no DOM, no accessibility labels). A vision-language model (VLM) receives screenshots and natural language instructions, then plans and executes actions.
- **Three AI Intents**:
  1. **Planning** — breaks down natural language instructions into step-by-step UI actions (`aiAct`/`ai`)
  2. **Insight** — extracts data, makes assertions, answers questions about screen content (`aiQuery`/`aiAssert`/`aiAsk`)
  3. **Locate** — precisely locates UI elements for interaction (`aiLocate`, used internally by `aiTap`, `aiInput`, etc.)
- **Native Bindings**: Under the hood, uses `screenshot-desktop` for screen capture and `libnut` (a fork of nut.js's native module) for mouse/keyboard control.
- **Cross-Platform**: Windows, macOS, and Linux (including headless Linux via Xvfb).

### How It Differs from @midscene/web
- `@midscene/web` controls **browser pages** via Puppeteer/Playwright/Chrome Bridge
- `@midscene/computer` controls the **entire desktop** — any application (Electron, Qt, WPF, native)
- Both share the same core AI engine and common API surface (`aiAct`, `aiQuery`, `aiAssert`, etc.)

---

## 2. Full API Reference

### Agent Creation

```typescript
import { agentFromComputer } from '@midscene/computer';

const agent = await agentFromComputer({
  // Optional: context for AI planning
  aiActionContext?: string;
  
  // Optional: enable caching
  cache?: boolean | { id: string; strategy?: 'read-write' | 'read-only' | 'write-only' };
  
  // Optional: target a specific display
  displayId?: string;
  
  // Optional: add custom device actions
  customActions?: DeviceAction<any>[];
  
  // Optional (Linux only): headless mode via Xvfb
  headless?: boolean;
  
  // Optional: Xvfb resolution (default: '1920x1080x24')
  xvfbResolution?: string;
  
  // Optional: model config (overrides env vars)
  modelConfig?: Record<string, string | number>;
  
  // Optional: wait time after each action (default: 300ms)
  waitAfterAction?: number;
  
  // Optional: max replanning cycles (default: 20, 40 for UI-TARS)
  replanningCycleLimit?: number;
  
  // Optional: report settings
  generateReport?: boolean;
  reportFileName?: string;
  outputFormat?: 'single-html' | 'html-and-external-assets';
  
  // Optional: screenshot scaling to reduce tokens
  screenshotShrinkFactor?: number;
});
```

### Device Management

```typescript
import { ComputerDevice, checkComputerEnvironment } from '@midscene/computer';

// List all displays
const displays = await ComputerDevice.listDisplays();
// Returns: DisplayInfo[] = [{ id: string, name: string, primary?: boolean }]

// Check environment readiness
const env = await checkComputerEnvironment();
// Returns: { available: boolean, error?: string, platform: string, displays: number }
```

### Core Interaction Methods

#### Auto Planning (AI decides the steps)

```typescript
// Full planning — AI breaks down instruction into steps
await agent.aiAct('open File menu, click Save As, type "report.pdf"');
await agent.ai('search for "Midscene" in Spotlight');  // shorthand

// With options
await agent.aiAct('fill out the form', {
  cacheable?: boolean,      // cache this action's plan (default: true)
  deepThink?: 'unset' | true | false,  // enable deep reasoning
  deepLocate?: boolean,     // two-pass element location
});
```

#### Instant Actions (you specify the action, AI just locates)

```typescript
await agent.aiTap('the Submit button');
await agent.aiTap('the Submit button', { deepLocate: true });

await agent.aiHover('the version number');  // web only

await agent.aiInput('the search box', { value: 'Hello World' });
await agent.aiInput('email field', { value: '', mode: 'clear' });

await agent.aiKeyboardPress('the search box', { keyName: 'Enter' });

await agent.aiScroll('the sidebar', { 
  scrollType: 'singleAction', 
  direction: 'down', 
  distance: 200 
});

await agent.aiDoubleClick('the file name');
await agent.aiRightClick('the desktop');
```

#### Data Extraction & Assertions

```typescript
// Query structured data from screen
const data = await agent.aiQuery('{title: string, items: string[]}, get the window title and menu items');

// Ask free-form questions
const answer = await agent.aiAsk('What application is currently in focus?');

// Get typed values directly
const count = await agent.aiNumber('How many tabs are open?');
const title = await agent.aiString('What is the window title?');
const isOpen = await agent.aiBoolean('Is the Settings panel visible?');

// Assert conditions (throws on failure)
await agent.aiAssert('The document has been saved successfully');

// Wait for conditions
await agent.aiWaitFor('the loading spinner disappears', { timeout: 10000 });

// Locate an element's position
const pos = await agent.aiLocate('the File menu');
// Returns: { x: number, y: number, width: number, height: number }
```

#### Utility Methods

```typescript
// Record screenshot to report
await agent.recordToReport('Step description', { screenshot: true });

// Destroy agent and clean up
await agent.destroy();

// Get report file path
const reportPath = agent.reportFile;
```

### Mouse Actions (via aiAct natural language)

| Action | Example |
|--------|---------|
| Click | `await agent.aiAct('click on the File menu')` |
| Double-click | `await agent.aiAct('double-click on the desktop icon')` |
| Right-click | `await agent.aiAct('right-click on the file')` |
| Mouse move | `await agent.aiAct('move mouse to the menu item')` |
| Drag & drop | `await agent.aiAct('drag the file to the folder')` |

### Keyboard Actions (via aiAct natural language)

| Action | Example |
|--------|---------|
| Type text | `await agent.aiAct('type "Hello World" in the search box')` |
| Key press | `await agent.aiAct('press Enter')` |
| Key combos | `await agent.aiAct('press Cmd+Space')` (macOS) |
| Function keys | `await agent.aiAct('press F5')` |
| Clear input | `await agent.aiAct('clear the text field')` |

### Scroll Actions

```typescript
await agent.aiAct('scroll down');
await agent.aiAct('scroll to top');
await agent.aiAct('scroll to bottom');
```

---

## 3. System Requirements

| Platform | Requirements |
|----------|-------------|
| **Node.js** | 18.19.0+ |
| **macOS** | Accessibility permissions (System Settings > Privacy & Security > Accessibility) for Terminal/IDE |
| **Linux** | ImageMagick for screenshots |
| **Linux (headless)** | Xvfb + x11-xserver-utils + imagemagick (`sudo apt-get install -y xvfb x11-xserver-utils imagemagick`) |
| **Windows** | No special requirements |

### Installation

```bash
npm install @midscene/computer
# or
yarn add @midscene/computer
# or
pnpm add @midscene/computer
```

---

## 4. Model Configuration

`@midscene/computer` requires a vision-language model. Configuration via environment variables:

### Required

```bash
export MIDSCENE_MODEL_API_KEY="your-api-key"
export MIDSCENE_MODEL_BASE_URL="https://your-model-provider/v1"
export MIDSCENE_MODEL_NAME="model-name"
export MIDSCENE_MODEL_FAMILY="model-family"   # CRITICAL — determines coordinate handling
```

### Recommended Models (ranked)

| Model | Family Value | Notes |
|-------|-------------|-------|
| **Doubao Seed 1.6/2.0** | `doubao-seed-1.6` / `doubao-seed-2.0` | ⭐⭐⭐⭐ Best at UI planning & targeting |
| **Qwen3.5** | `qwen3.5` | ⭐⭐⭐⭐ Stronger than Qwen3-VL |
| **Qwen3-VL** | `qwen3-vl` | ⭐⭐⭐ Good balance, open-source option |
| **Gemini-3-Pro/Flash** | `gemini` | ⭐⭐⭐ Good but pricier |
| **UI-TARS** | `vlm-ui-tars` | ⭐⭐ Strong exploration, variable results |
| **GLM-4.6V** | `glm-v` | Newly integrated, open weights |

> **Note**: GPT-5.x models lack strong visual grounding and CANNOT be used as the default model. They can be used as dedicated Planning or Insight models.

### Multi-Model Configuration (Advanced)

Use different models for planning vs. localization vs. understanding:

```bash
# Default model (handles element localization)
export MIDSCENE_MODEL_NAME="qwen3-vl-plus"
export MIDSCENE_MODEL_FAMILY="qwen3-vl"

# Planning model (handles task breakdown)
export MIDSCENE_PLANNING_MODEL_NAME="gpt-5.1"
export MIDSCENE_PLANNING_MODEL_API_KEY="sk-..."
export MIDSCENE_PLANNING_MODEL_BASE_URL="https://..."

# Insight model (handles data extraction/assertions)
export MIDSCENE_INSIGHT_MODEL_NAME="gpt-5.1"
export MIDSCENE_INSIGHT_MODEL_API_KEY="sk-..."
```

### Or Configure via Code

```typescript
const agent = await agentFromComputer({
  modelConfig: {
    MIDSCENE_MODEL_NAME: 'qwen3-vl-plus',
    MIDSCENE_MODEL_BASE_URL: 'https://...',
    MIDSCENE_MODEL_API_KEY: 'sk-...',
    MIDSCENE_MODEL_FAMILY: 'qwen3-vl',
  }
});
```

---

## 5. Best Practices

### 5.1 Prompt Design

- **Be specific and descriptive**: "Click the blue 'Submit' button at the bottom of the form" > "Click submit"
- **Break complex tasks into steps**: Use multiple `aiAct` calls instead of one massive instruction
- **Use `aiActionContext`** to set persistent context: `aiActionContext: 'You are automating a macOS desktop. The app uses dark mode.'`
- **Platform-aware prompts**: Check `process.platform` for platform-specific key combos (Cmd vs Ctrl)

### 5.2 Action Selection

- **Use Instant Actions when possible**: `aiTap`, `aiInput`, `aiKeyboardPress` are faster and more reliable than `aiAct` because AI only needs to locate (not plan)
- **Reserve `aiAct`/`ai` for multi-step workflows**: where AI planning adds value
- **Use `aiWaitFor` between steps**: to ensure UI has settled before the next action

### 5.3 Reliability

- **Set `waitAfterAction`**: Default is 300ms. Increase for slow applications: `waitAfterAction: 500`
- **Use `deepLocate: true`** for small or hard-to-distinguish elements (two-pass localization)
- **Use `deepThink: true`** in `aiAct` for complex multi-step forms
- **Set `replanningCycleLimit`**: Default 20 cycles. Increase to 40+ for complex workflows
- **Add `aiWaitFor` verification** after navigation: `await agent.aiWaitFor('the Settings page is visible')`
- **Use `aiAssert`** after actions to verify success

### 5.4 Performance Optimization

- **Enable caching** for repeated test runs: `cache: { id: 'my-test', strategy: 'read-write' }`
- **Use `screenshotShrinkFactor: 2`** for mobile/smaller screens to reduce token usage
- **Use smaller/faster models** for localization (default model) and larger models only for planning
- **Prefer Instant Actions** over Auto Planning — they skip the planning step

### 5.5 Error Handling

```typescript
try {
  await agent.aiAct('click the Save button');
} catch (error) {
  // AI couldn't find element or action failed
  console.error('Action failed:', error.message);
  // Take a diagnostic screenshot
  await agent.recordToReport('Error state', { screenshot: true });
}

// Use aiWaitFor with timeout for conditions
try {
  await agent.aiWaitFor('file saved dialog appears', { timeout: 5000 });
} catch {
  console.error('Save dialog did not appear within 5 seconds');
}
```

---

## 6. Common Pitfalls & How to Avoid Them

| Pitfall | Solution |
|---------|----------|
| **Missing `MIDSCENE_MODEL_FAMILY`** | ALWAYS set this — determines coordinate handling. Error: "No visual language model detected" |
| **Using GPT-5.x as default model** | GPT models lack visual grounding. Use Qwen/Doubao/Gemini as default, GPT as Planning model only |
| **macOS accessibility not granted** | Grant Terminal/IDE access in System Settings > Privacy & Security > Accessibility |
| **Headless Linux missing Xvfb** | Install: `apt-get install -y xvfb x11-xserver-utils imagemagick` |
| **Agent created BEFORE Xvfb starts** | Create agent first (`agentFromComputer({ headless: true })`), THEN launch your app. Agent starts Xvfb. |
| **Process hangs after demo completes** | Child processes (Electron app) keep Node alive. Use `process.kill(childPid, 'SIGKILL')` then `process.exit(0)` |
| **Slow execution** | Enable caching, use Instant Actions, tune `waitAfterAction` |
| **Flaky element detection** | Use `deepLocate: true`, improve prompt specificity, try a better model |
| **Wrong key combinations** | Always check `process.platform` — use `Cmd` for macOS, `Ctrl` for Windows/Linux |
| **macOS IME issues with text input** | v1.5 fixed this — all macOS text input now uses clipboard to avoid IME |
| **Mouse control failures** | v1.5 added auto-detection — may need admin privileges on some systems |

---

## 7. Integration Patterns with Electron

### 7.1 Testing Electron Apps with @midscene/computer

The official approach (see: [electron-demo example](https://github.com/web-infra-dev/midscene-example/tree/main/computer/electron-demo)):

```typescript
import { agentFromComputer } from '@midscene/computer';
import { spawn } from 'child_process';

// 1. Create agent FIRST (starts Xvfb on headless Linux)
const agent = await agentFromComputer({
  headless: true,  // for CI
  xvfbResolution: '2560x1440x24',  // higher res for better AI recognition
  aiActionContext: 'You are testing an Electron desktop app.',
});

// 2. THEN launch the Electron app
const app = spawn('./your-electron-app', ['--no-sandbox', '--disable-gpu'], {
  env: { ...process.env, DISPLAY: process.env.DISPLAY },
});

// 3. Wait for app to be ready
await agent.aiWaitFor('the application window is visible', { timeout: 15000 });

// 4. Interact with the app
await agent.aiAct('click on Settings');
await agent.aiWaitFor('Settings panel is open');

const version = await agent.aiString('What version is shown in Settings?');
await agent.aiAssert('The Settings panel has a "General" tab');

// 5. Clean up
app.kill('SIGKILL');
await agent.destroy();
process.exit(0);  // Force exit — Electron child processes can keep Node alive
```

### 7.2 Headless CI Setup (GitHub Actions)

```yaml
# .github/workflows/electron-test.yaml
jobs:
  test:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y xvfb x11-xserver-utils imagemagick \
            fluxbox adwaita-icon-theme gnome-themes-extra \
            fonts-noto-cjk dbus-x11
          npm install
      
      - name: Run tests
        env:
          MIDSCENE_MODEL_API_KEY: ${{ secrets.MODEL_API_KEY }}
          MIDSCENE_MODEL_NAME: qwen3-vl-plus
          MIDSCENE_MODEL_FAMILY: qwen3-vl
          MIDSCENE_COMPUTER_HEADLESS_LINUX: true
          MIDSCENE_REPLANNING_CYCLE_LIMIT: 40
        run: npx tsx demo.ts
```

### 7.3 Key Lessons from the Obsidian Electron Demo

From the official example (actively maintained, last updated Mar 1, 2026):

1. **Create agent BEFORE launching app** — `agentFromComputer()` starts Xvfb and sets `DISPLAY`. The app needs this.
2. **Use `--no-sandbox` for Electron in CI** — required for headless Linux environments.
3. **Configure fluxbox window manager** — for proper window decorations and auto-maximizing:
   ```
   Write ~/.fluxbox/apps config before starting fluxbox so all windows launch maximized
   ```
4. **Install GTK themes** — for native UI styling (adwaita, gnome-themes-extra).
5. **Use higher Xvfb resolution** — `2560x1440x24` for better AI recognition quality.
6. **Force process exit** — Electron child processes keep Node.js alive. Use `SIGKILL` + `process.exit(0)`.
7. **Add `aiWaitFor` between navigation steps** — to catch failures early.
8. **Split conditional actions** — separate "Turn on" and "Confirm" into distinct steps.
9. **Set `MIDSCENE_REPLANNING_CYCLE_LIMIT=40`** — as safety net for complex Electron UI flows.

### 7.4 Using @midscene/computer INSIDE an Electron App

For your Gemini Desktop Assistant use case (controlling the OS FROM an Electron app):

```typescript
// In Electron main process
import { agentFromComputer } from '@midscene/computer';

// Create a persistent agent
const agent = await agentFromComputer({
  aiActionContext: 'You are an AI assistant controlling a macOS desktop.',
  modelConfig: {
    MIDSCENE_MODEL_NAME: 'gemini-3-pro',
    MIDSCENE_MODEL_FAMILY: 'gemini',
    MIDSCENE_MODEL_API_KEY: process.env.GOOGLE_API_KEY,
    MIDSCENE_MODEL_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  }
});

// Execute Gemini tool calls via IPC
ipcMain.handle('execute-midscene-action', async (event, action: string) => {
  try {
    await agent.aiAct(action);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

---

## 8. Caching for Performance

Caching can reduce execution time by ~45% by reusing AI planning results.

```typescript
const agent = await agentFromComputer({
  cache: { id: 'my-workflow', strategy: 'read-write' },
});

// Cached results stored in ./midscene_run/cache/my-workflow.cache.yaml
```

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `read-write` | Read + auto-update cache | Development, iteration |
| `read-only` | Read only, manual `flushCache()` | Production, CI |
| `write-only` | Always call AI, write results | Building initial cache |
| `false` | No caching | Debugging |

**Note**: `aiQuery`, `aiAssert`, `aiBoolean` are NEVER cached (always need fresh data).

---

## 9. Debugging & Observability

### HTML Reports
- Generated automatically (default: `./midscene_run/report/`)
- Visual replay of all actions with screenshots
- Token usage statistics per model
- Timeline with step-by-step breakdown

### Debug Logging

```bash
DEBUG=midscene:ai:profile:stats  # Token usage, latency
DEBUG=midscene:ai:call            # Full AI responses
DEBUG=midscene:cache:*            # Cache hit/miss details
DEBUG=midscene:*                  # Everything
```

### Observability Integrations
- **LangSmith**: `npm install langsmith && export MIDSCENE_LANGSMITH_DEBUG=1`
- **Langfuse**: `npm install @langfuse/openai @langfuse/otel @opentelemetry/sdk-node && export MIDSCENE_LANGFUSE_DEBUG=1`

---

## 10. Version History & Roadmap

| Version | Date | Key Features |
|---------|------|-------------|
| **v1.5** | Feb 2026 | HarmonyOS support, Qwen3.5/doubao-seed 2.0, Xvfb headless, macOS clipboard input fix |
| **v1.4** | Jan 2026 | Skills for AI assistants (Claude Code, OpenClaw), standalone MCP desktop package, `deepLocate` |
| **v1.3** | Dec 2025 | **PC Desktop automation introduced** (`@midscene/computer`), multi-monitor, headless Linux |
| **v1.2** | Nov 2025 | Zhipu AI models, file upload |
| **v1.1** | Oct 2025 | `aiAct` deep thinking, MCP SDK |
| **v1.0** | Sep 2025 | Pure vision approach (DOM removed), multi-model combos, token reduction |

### What's Coming
- Continued model support (newer Gemini, GPT, open-source VLMs)
- `@midscene/computer-mcp` for using desktop automation as an MCP tool
- Midscene Skills ecosystem expansion
- iOS and HarmonyOS desktop automation parity

---

## 11. Comparison with Alternatives

| Feature | @midscene/computer | Anthropic Computer Use | nut.js | RobotJS |
|---------|-------------------|----------------------|--------|---------|
| **Approach** | Vision + AI planning | Vision + AI planning | Programmatic API | Programmatic API |
| **AI-Powered** | ✅ Natural language | ✅ Natural language | ❌ Manual coordinates | ❌ Manual coordinates |
| **Cross-Platform** | Win/Mac/Linux | Win/Mac/Linux | Win/Mac/Linux | Win/Mac/Linux |
| **Headless CI** | ✅ Xvfb support | ❌ | ❌ | ❌ |
| **Model Choice** | Any VLM (Qwen, Gemini, etc.) | Claude only | N/A | N/A |
| **Self-Hostable** | ✅ Open-source models | ❌ Claude API only | N/A | N/A |
| **Element Location** | AI vision (any app) | AI vision (any app) | Image matching + coordinates | Pixel colors |
| **Caching** | ✅ Plan + locate cache | ❌ | ❌ | ❌ |
| **Reports** | ✅ HTML replay | ❌ | ❌ | ❌ |
| **YAML Scripting** | ✅ | ❌ | ❌ | ❌ |
| **MCP Integration** | ✅ `@midscene/computer-mcp` | Via Claude tools | ❌ | ❌ |
| **Multi-Display** | ✅ | Limited | ❌ | ❌ |
| **npm Package** | ✅ | ❌ (API only) | ✅ | ✅ (stale) |
| **Maintenance** | Active (weekly updates) | Active | Active | Dormant |

### When to Choose @midscene/computer
- You need **AI-driven automation** with natural language
- You want **model flexibility** (not locked to one provider)
- You need **CI/headless support** for desktop testing
- You want **visual reports** and debugging tools
- You're building an **AI assistant** that controls the desktop

### When to Choose Anthropic Computer Use
- You're already in the Claude ecosystem
- You need **the simplest integration** with Claude API
- Budget isn't a primary concern

### When to Choose nut.js
- You need **deterministic, pixel-precise** automation
- No AI/model costs are acceptable
- Your app has stable, unchanging UI

---

## 12. Quick Start Template

```typescript
// quick-start.ts
import { agentFromComputer, checkComputerEnvironment } from '@midscene/computer';

async function main() {
  // 1. Check environment
  const env = await checkComputerEnvironment();
  if (!env.available) {
    console.error('Environment not ready:', env.error);
    process.exit(1);
  }
  console.log(`Platform: ${env.platform}, Displays: ${env.displays}`);

  // 2. Create agent
  const agent = await agentFromComputer({
    aiActionContext: 'You are automating a desktop computer.',
    cache: { id: 'quick-start' },
  });

  try {
    // 3. Open an app
    if (process.platform === 'darwin') {
      await agent.aiAct('press Cmd+Space');
      await agent.aiAct('type "Calculator" and press Enter');
    } else {
      await agent.aiAct('press Windows key');
      await agent.aiAct('type "Calculator" and press Enter');
    }

    await agent.aiWaitFor('Calculator app is visible');

    // 4. Interact
    await agent.aiAct('click 7');
    await agent.aiAct('click multiply button');
    await agent.aiAct('click 8');
    await agent.aiAct('click equals button');

    // 5. Verify result
    const result = await agent.aiString('What number is shown on the calculator display?');
    console.log('Result:', result);
    await agent.aiAssert('The calculator shows 56');

    console.log('✅ Automation completed successfully!');
  } catch (error) {
    console.error('❌ Automation failed:', error);
  } finally {
    await agent.destroy();
  }
}

main();
```

Run with: `npx tsx quick-start.ts`

---

## Sources

- [Official API Reference (PC Desktop)](https://midscenejs.com/computer-api-reference.html)
- [Official Getting Started Guide](https://midscenejs.com/computer-getting-started.html)
- [Official Introduction](https://midscenejs.com/computer-introduction)
- [Common API Reference](https://midscenejs.com/api.html)
- [Model Strategy](https://midscenejs.com/model-strategy.html)
- [Model Configuration](https://midscenejs.com/model-config.html)
- [Caching Documentation](https://midscenejs.com/caching.html)
- [Changelog](https://midscenejs.com/changelog)
- [GitHub Repository](https://github.com/web-infra-dev/midscene)
- [Electron Demo (Obsidian)](https://github.com/web-infra-dev/midscene-example/tree/main/computer/electron-demo)
- [npm Package](https://www.npmjs.com/package/@midscene/computer)
- [Midscene.js Article by Zack Jackson](https://scriptedalchemy.medium.com/midscene-js-machine-vision-computer-use-571e...)
