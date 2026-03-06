import { app, BrowserWindow, desktopCapturer, ipcMain, screen, systemPreferences } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { config as dotenvConfig } from 'dotenv'
import { agentFromComputer } from '@midscene/computer'

type RegionBounds = {
  x: number
  y: number
  width: number
  height: number
}

type ScreenSource = {
  id: string
  name: string
  displayId: string
  isPrimary: boolean
  bounds: RegionBounds
  scaleFactor: number
}

type RegionSelectionResult = {
  sourceId: string
  displayId: string
  region: RegionBounds
}

// Load .env from project root (one level up from frontend/)
const __dirnameResolved = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: join(__dirnameResolved, '..', '..', '.env') })

let midsceneAgent: Awaited<ReturnType<typeof agentFromComputer>> | null = null

const __dirname = dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = join(__dirname, '..')

// Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let ghostCursorWin: BrowserWindow | null = null
let regionSelectorWin: BrowserWindow | null = null
let selectedMidsceneDisplayId: string | undefined

async function requestPermissions() {
  if (process.platform === 'darwin') {
    const screenPrivilege = systemPreferences.getMediaAccessStatus('screen')
    if (screenPrivilege !== 'granted') {
      console.log('Screen recording privilege not granted. Trying to prompt...')
    }
    const accessibilityPrivilege = systemPreferences.isTrustedAccessibilityClient(false)
    if (!accessibilityPrivilege) {
      console.log('Accessibility privilege not granted.')
      systemPreferences.isTrustedAccessibilityClient(true)
    }
    const micPrivilege = systemPreferences.getMediaAccessStatus('microphone')
    if (micPrivilege !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(RENDERER_DIST, 'index.html'))
  }
}

function createGhostCursorWindow() {
  ghostCursorWin = new BrowserWindow({
    width: 60,
    height: 60,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  ghostCursorWin.setIgnoreMouseEvents(true, { forward: true })

  const html = `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: transparent;
          }
          .cursor {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: rgba(56, 189, 248, 0.4);
            border: 3px solid rgba(56, 189, 248, 0.8);
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.8);
            animation: pulse 1s infinite cubic-bezier(0.4, 0, 0.6, 1);
          }
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.8; }
          }
        </style>
      </head>
      <body>
        <div class="cursor"></div>
      </body>
    </html>
  `
  ghostCursorWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  ghostCursorWin.hide()
}

function getScreenSourcesMetadata(): ScreenSource[] {
  const displays = screen.getAllDisplays()
  return displays.map((display) => ({
    id: '',
    name: display.label || `Display ${display.id}`,
    displayId: String(display.id),
    isPrimary: display.id === screen.getPrimaryDisplay().id,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
    scaleFactor: display.scaleFactor,
  }))
}

async function listDesktopSources(): Promise<ScreenSource[]> {
  const displays = getScreenSourcesMetadata()
  const displayMap = new Map(displays.map((display) => [display.displayId, display]))
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    fetchWindowIcons: false,
    thumbnailSize: { width: 0, height: 0 },
  })

  return sources.flatMap((source) => {
    const display = source.display_id ? displayMap.get(source.display_id) : undefined
    if (!display) {
      return []
    }

    return [
      {
        ...display,
        id: source.id,
        name: source.name || display.name,
      },
    ]
  })
}

function buildOverlayHtml(source: ScreenSource): string {
  const minWidth = 240
  const minHeight = 160
  const initialWidth = Math.max(minWidth, Math.round(source.bounds.width * 0.44))
  const initialHeight = Math.max(minHeight, Math.round(source.bounds.height * 0.36))
  const initialLeft = Math.round((source.bounds.width - initialWidth) / 2)
  const initialTop = Math.round((source.bounds.height - initialHeight) / 2)

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Choose Shared Area</title>
        <style>
          :root {
            color-scheme: dark;
            --panel-bg: rgba(6, 23, 48, 0.82);
            --panel-border: rgba(148, 163, 184, 0.28);
            --shadow: 0 30px 90px rgba(2, 6, 23, 0.55);
            --accent: #38bdf8;
            --accent-strong: #0ea5e9;
            --warm: #f97316;
          }
          * { box-sizing: border-box; user-select: none; }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            font-family: "Segoe UI", "SF Pro Display", sans-serif;
            background:
              radial-gradient(circle at top, rgba(56, 189, 248, 0.12), transparent 28%),
              radial-gradient(circle at bottom right, rgba(249, 115, 22, 0.12), transparent 25%),
              rgba(2, 6, 23, 0.32);
            color: white;
            cursor: default;
          }
          .hud {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: min(760px, calc(100vw - 40px));
            padding: 18px 20px;
            border-radius: 22px;
            border: 1px solid var(--panel-border);
            background: var(--panel-bg);
            backdrop-filter: blur(18px);
            box-shadow: var(--shadow);
            pointer-events: none;
          }
          .hud h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.01em;
          }
          .hud p {
            margin: 8px 0 0;
            color: rgba(226, 232, 240, 0.88);
            font-size: 14px;
            line-height: 1.45;
          }
          .stats {
            margin-top: 12px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.68);
            color: rgba(191, 219, 254, 0.95);
            font-size: 13px;
          }
          .stage {
            position: fixed;
            inset: 0;
          }
          .spotlight {
            position: absolute;
            inset: 0;
            background: rgba(2, 6, 23, 0.48);
            pointer-events: none;
          }
          .cutout {
            position: absolute;
            border-radius: 28px;
            box-shadow:
              0 0 0 200vmax rgba(2, 6, 23, 0.54),
              0 20px 60px rgba(14, 165, 233, 0.18);
            border: 2px solid rgba(125, 211, 252, 0.95);
            outline: 1px solid rgba(255, 255, 255, 0.18);
            background:
              linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(249, 115, 22, 0.1));
            cursor: move;
          }
          .cutout::before {
            content: "";
            position: absolute;
            inset: 10px;
            border-radius: 20px;
            border: 1px dashed rgba(255, 255, 255, 0.28);
          }
          .handle {
            position: absolute;
            width: 18px;
            height: 18px;
            border-radius: 999px;
            background: linear-gradient(135deg, #f8fafc, #7dd3fc);
            border: 2px solid rgba(2, 6, 23, 0.7);
            box-shadow: 0 10px 22px rgba(2, 6, 23, 0.3);
          }
          .handle.nw { left: -9px; top: -9px; cursor: nwse-resize; }
          .handle.ne { right: -9px; top: -9px; cursor: nesw-resize; }
          .handle.sw { left: -9px; bottom: -9px; cursor: nesw-resize; }
          .handle.se { right: -9px; bottom: -9px; cursor: nwse-resize; }
          .label {
            position: absolute;
            left: 18px;
            bottom: 18px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.82);
            border: 1px solid rgba(148, 163, 184, 0.24);
            backdrop-filter: blur(10px);
            font-size: 13px;
            color: rgba(226, 232, 240, 0.95);
            pointer-events: none;
          }
          .label strong {
            color: white;
            font-weight: 700;
            letter-spacing: 0.01em;
          }
          .actions {
            position: fixed;
            right: 24px;
            bottom: 24px;
            display: flex;
            gap: 12px;
          }
          button {
            border: none;
            border-radius: 16px;
            padding: 14px 18px;
            min-width: 132px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.01em;
            cursor: pointer;
            transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
            box-shadow: var(--shadow);
          }
          button:hover { transform: translateY(-1px); }
          button:active { transform: translateY(0); }
          .cancel {
            background: rgba(15, 23, 42, 0.82);
            color: rgba(226, 232, 240, 0.95);
            border: 1px solid rgba(148, 163, 184, 0.2);
          }
          .confirm {
            background: linear-gradient(135deg, var(--accent), var(--warm));
            color: #082f49;
          }
        </style>
      </head>
      <body>
        <div class="hud">
          <h1>Choose the area Gemini should watch</h1>
          <p>Drag the frame to reposition it. Pull the corner handles to resize. Midscene will stay on this display, while Gemini receives only what fits inside the selection.</p>
          <div class="stats" id="stats">Selected area</div>
        </div>
        <div class="stage" id="stage">
          <div class="spotlight"></div>
          <div class="cutout" id="box">
            <div class="handle nw" data-handle="nw"></div>
            <div class="handle ne" data-handle="ne"></div>
            <div class="handle sw" data-handle="sw"></div>
            <div class="handle se" data-handle="se"></div>
            <div class="label"><strong>${source.name.replace(/</g, '&lt;')}</strong><span id="label"></span></div>
          </div>
        </div>
        <div class="actions">
          <button class="cancel" id="cancelButton">Cancel</button>
          <button class="confirm" id="confirmButton">Share this area</button>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          const sourceId = ${JSON.stringify(source.id)};
          const displayId = ${JSON.stringify(source.displayId)};
          const stage = document.getElementById('stage');
          const box = document.getElementById('box');
          const stats = document.getElementById('stats');
          const label = document.getElementById('label');
          const confirmButton = document.getElementById('confirmButton');
          const cancelButton = document.getElementById('cancelButton');
          const minWidth = ${minWidth};
          const minHeight = ${minHeight};
          const stageWidth = window.innerWidth;
          const stageHeight = window.innerHeight;
          let rect = {
            x: ${initialLeft},
            y: ${initialTop},
            width: ${initialWidth},
            height: ${initialHeight},
          };
          let drag = null;

          function clampRect(nextRect) {
            const width = Math.max(minWidth, Math.min(stageWidth, nextRect.width));
            const height = Math.max(minHeight, Math.min(stageHeight, nextRect.height));
            const x = Math.min(Math.max(0, nextRect.x), stageWidth - width);
            const y = Math.min(Math.max(0, nextRect.y), stageHeight - height);
            return { x, y, width, height };
          }

          function updateRect(nextRect) {
            rect = clampRect(nextRect);
            box.style.left = rect.x + 'px';
            box.style.top = rect.y + 'px';
            box.style.width = rect.width + 'px';
            box.style.height = rect.height + 'px';
            const text = Math.round(rect.width) + ' × ' + Math.round(rect.height) + ' px';
            label.textContent = text;
            stats.textContent = 'Selected area: ' + text + ' • origin ' + Math.round(rect.x) + ', ' + Math.round(rect.y);
          }

          function startMove(event) {
            if (event.target.dataset.handle) {
              return;
            }
            drag = {
              mode: 'move',
              startX: event.clientX,
              startY: event.clientY,
              rect: { ...rect },
            };
          }

          function startResize(event, handle) {
            drag = {
              mode: handle,
              startX: event.clientX,
              startY: event.clientY,
              rect: { ...rect },
            };
            event.stopPropagation();
          }

          function onPointerMove(event) {
            if (!drag) {
              return;
            }
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;

            if (drag.mode === 'move') {
              updateRect({
                ...drag.rect,
                x: drag.rect.x + dx,
                y: drag.rect.y + dy,
              });
              return;
            }

            const next = { ...drag.rect };
            if (drag.mode.includes('n')) {
              next.y = drag.rect.y + dy;
              next.height = drag.rect.height - dy;
            }
            if (drag.mode.includes('s')) {
              next.height = drag.rect.height + dy;
            }
            if (drag.mode.includes('w')) {
              next.x = drag.rect.x + dx;
              next.width = drag.rect.width - dx;
            }
            if (drag.mode.includes('e')) {
              next.width = drag.rect.width + dx;
            }

            if (next.width < minWidth) {
              if (drag.mode.includes('w')) {
                next.x -= minWidth - next.width;
              }
              next.width = minWidth;
            }
            if (next.height < minHeight) {
              if (drag.mode.includes('n')) {
                next.y -= minHeight - next.height;
              }
              next.height = minHeight;
            }

            updateRect(next);
          }

          function finishDrag() {
            drag = null;
          }

          async function confirmSelection() {
            confirmButton.disabled = true;
            await ipcRenderer.invoke('resolve-region-selector', {
              sourceId,
              displayId,
              region: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            });
          }

          async function cancelSelection() {
            await ipcRenderer.invoke('cancel-region-selector');
          }

          box.addEventListener('pointerdown', startMove);
          stage.addEventListener('pointermove', onPointerMove);
          stage.addEventListener('pointerup', finishDrag);
          stage.addEventListener('pointerleave', finishDrag);
          document.querySelectorAll('[data-handle]').forEach((handleNode) => {
            handleNode.addEventListener('pointerdown', (event) => {
              startResize(event, event.target.dataset.handle);
            });
          });
          confirmButton.addEventListener('click', confirmSelection);
          cancelButton.addEventListener('click', cancelSelection);
          window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              cancelSelection();
            }
            if (event.key === 'Enter') {
              confirmSelection();
            }
          });

          updateRect(rect);
        </script>
      </body>
    </html>
  `
}

function closeRegionSelector() {
  if (regionSelectorWin && !regionSelectorWin.isDestroyed()) {
    regionSelectorWin.close()
  }
  regionSelectorWin = null
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
    ghostCursorWin = null
    regionSelectorWin = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    createGhostCursorWindow()
  }
})

app.whenReady().then(async () => {
  await requestPermissions()

  process.env.MIDSCENE_MODEL_NAME = 'gemini-3.1-pro-preview'
  process.env.MIDSCENE_USE_GEMINI = '1'
  process.env.OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

  // Set the API key explicitly since .env is not packaged in the final executable
  process.env.OPENAI_API_KEY = 'AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8'

  let midsceneIsActive = false
  let isPlanning = false
  let currentMidsceneReject: ((reason?: unknown) => void) | null = null
  let regionSelectorResolve: ((value: RegionSelectionResult | null) => void) | null = null
  let regionSelectorSettled = false

  function setupMidsceneAgent() {
    if (!midsceneAgent) return
    midsceneAgent.addDumpUpdateListener((dumpStr, executionDump) => {
      if (!ghostCursorWin || !executionDump || !executionDump.tasks) return

      let targetCenter: [number, number] | null = null

      const tasks = executionDump.tasks
      for (let i = tasks.length - 1; i >= 0; i -= 1) {
        const task = tasks[i]

        if (
          task.output &&
          typeof task.output === 'object' &&
          'element' in task.output &&
          (task.output as { element?: { center?: [number, number] } }).element
        ) {
          const element = (task.output as { element?: { center?: [number, number] } }).element
          if (element?.center) targetCenter = element.center
          break
        }

        if (task.type === 'Action Space' && task.param && typeof task.param === 'object') {
          const param = task.param as { center?: [number, number] }
          if (param.center) targetCenter = param.center
        }

        if (!targetCenter && task.output && typeof task.output === 'object' && 'actions' in task.output) {
          const actions = (task.output as { actions?: Array<{ param?: { bbox?: number[] } }> }).actions
          if (Array.isArray(actions) && actions.length > 0) {
            const lastAction = actions[actions.length - 1]
            const bbox = lastAction?.param?.bbox
            if (bbox && bbox.length === 4) {
              targetCenter = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
              break
            }
          }
        }
        if (targetCenter) break
      }

      const runningTask = tasks.find((task) => task.status === 'running')
      const isRunning = !!runningTask

      if (runningTask) {
        isPlanning = runningTask.type === 'Planning'
      } else {
        isPlanning = false
      }

      if (isRunning && targetCenter && targetCenter.length === 2) {
        const x = Math.round(targetCenter[0] - 30)
        const y = Math.round(targetCenter[1] - 30)

        ghostCursorWin.setBounds({ x, y, width: 60, height: 60 })
        if (!ghostCursorWin.isVisible()) {
          ghostCursorWin.showInactive()
        }
      } else if (!isRunning && ghostCursorWin.isVisible()) {
        ghostCursorWin.hide()
      }
    })
  }

  async function initializeMidscene(displayId?: string) {
    if (midsceneAgent) {
      await midsceneAgent.destroy().catch((error) => {
        console.error('Failed to destroy previous Midscene agent:', error)
      })
      midsceneAgent = null
    }

    selectedMidsceneDisplayId = displayId
    midsceneAgent = await agentFromComputer(displayId ? { displayId } : undefined)
    setupMidsceneAgent()
    console.log('Midscene ready for display:', displayId ?? 'default')
  }

  function abortMidscene(reason: string) {
    if (!midsceneIsActive) return
    console.log('Action sequence aborted due to interrupt:', reason)

    midsceneIsActive = false
    isPlanning = false

    if (currentMidsceneReject) {
      currentMidsceneReject(new Error('Action sequence aborted due to interrupt: ' + reason))
      currentMidsceneReject = null
    }

    if (midsceneAgent) {
      midsceneAgent.destroy()
      midsceneAgent = null
    }

    initializeMidscene(selectedMidsceneDisplayId).catch((error) => {
      console.error('Failed to re-initialize midscene:', error)
    })
  }

  try {
    await initializeMidscene()
  } catch (error) {
    console.error('Failed to initialize Midscene:', error)
  }

  ipcMain.handle('execute-midscene-action', async (_, args: { action: string }) => {
    if (!midsceneAgent) {
      throw new Error('Midscene not initialized')
    }
    console.log('Tool call received in main process:', args)
    midsceneIsActive = true

    return new Promise((resolve, reject) => {
      currentMidsceneReject = reject

      midsceneAgent!
        .aiAction(args.action)
        .then((result) => {
          if (!midsceneIsActive) return
          midsceneIsActive = false
          console.log('Midscene action completed', result)
          resolve('Action executed successfully')
        })
        .catch((error) => {
          if (!midsceneIsActive) return
          midsceneIsActive = false
          console.error('Midscene action failed', error)
          reject(error)
        })
    })
  })

  ipcMain.handle('interrupt-midscene', () => {
    abortMidscene('User spoke (interrupt trigger)')
  })

  ipcMain.handle('set-midscene-display', async (_, displayId?: string) => {
    await initializeMidscene(displayId)
    return { ok: true }
  })

  let lastMousePos = screen.getCursorScreenPoint()
  setInterval(() => {
    if (midsceneIsActive && isPlanning) {
      const currentPos = screen.getCursorScreenPoint()
      const distance = Math.hypot(currentPos.x - lastMousePos.x, currentPos.y - lastMousePos.y)
      if (distance > 15) {
        abortMidscene('Physical mouse movement detected')
      }
      lastMousePos = currentPos
    } else {
      lastMousePos = screen.getCursorScreenPoint()
    }
  }, 100)

  ipcMain.handle('get-desktop-sources', async () => {
    return await listDesktopSources()
  })

  ipcMain.handle('open-region-selector', async (_, source: ScreenSource) => {
    closeRegionSelector()

    const display = screen.getAllDisplays().find((candidate) => String(candidate.id) === source.displayId)
    if (!display) {
      throw new Error(`Display ${source.displayId} is no longer available`)
    }

    regionSelectorSettled = false

    regionSelectorWin = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    })

    regionSelectorWin.setAlwaysOnTop(true, 'screen-saver')
    regionSelectorWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildOverlayHtml(source))}`)
    regionSelectorWin.focus()

    return await new Promise<RegionSelectionResult | null>((resolve) => {
      regionSelectorResolve = resolve

      regionSelectorWin?.once('closed', () => {
        regionSelectorWin = null
        if (!regionSelectorSettled && regionSelectorResolve) {
          regionSelectorResolve(null)
        }
        regionSelectorResolve = null
      })
    })
  })

  ipcMain.handle('resolve-region-selector', async (_, result: RegionSelectionResult) => {
    if (regionSelectorResolve) {
      regionSelectorSettled = true
      regionSelectorResolve(result)
    }
    closeRegionSelector()
    return { ok: true }
  })

  ipcMain.handle('cancel-region-selector', async () => {
    if (regionSelectorResolve) {
      regionSelectorSettled = true
      regionSelectorResolve(null)
    }
    closeRegionSelector()
    return { ok: true }
  })

  ipcMain.handle('ping', () => 'pong')

  createWindow()
  createGhostCursorWindow()
})
