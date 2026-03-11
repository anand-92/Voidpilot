import { app, BrowserWindow, desktopCapturer, ipcMain, screen, systemPreferences, dialog } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { execFile } from 'node:child_process'
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

async function requestMicrophonePermission() {
  if (process.platform === 'darwin') {
    const micPrivilege = systemPreferences.getMediaAccessStatus('microphone')
    if (micPrivilege !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }
}

function requestScreenPermissions() {
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
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 760,
    resizable: true,
    backgroundColor: '#06111f',
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
  await requestMicrophonePermission()

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
    requestScreenPermissions()

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

  // Midscene is initialized lazily when screen sharing is enabled via set-midscene-display

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

  ipcMain.handle('run-bash', async (_, args: { command: string; timeout?: number }) => {
    const { response } = await dialog.showMessageBox(win || BrowserWindow.getAllWindows()[0], {
      type: 'warning',
      buttons: ['Deny', 'Allow'],
      defaultId: 0,
      title: 'Command Confirmation',
      message: 'Gemini wants to run this command on your computer',
      detail: `Command:\n${args.command}\n\nYou can also say "yes" or "no" to approve/deny.`,
    })

    if (response === 0) {
      return 'User denied the command — it was not executed.'
    }

    const timeout = Math.min(Math.max(args.timeout ?? 30, 1), 120) * 1000 // ms
    const maxOutput = 4000

    console.log(`[run-bash] Executing: ${args.command} (timeout: ${timeout}ms)`)

    return new Promise<string>((resolve) => {
      const child = execFile(
        '/bin/bash',
        ['-l', '-c', args.command],
        {
          timeout,
          maxBuffer: 1024 * 1024, // 1MB
          env: { ...process.env, TERM: 'dumb' },
        },
        (error, stdout, stderr) => {
          const parts: string[] = []

          if (stdout) parts.push(stdout.trim())
          if (stderr) parts.push(`[stderr]\n${stderr.trim()}`)

          if (error) {
            if (error.killed) {
              parts.push(`[timed out after ${timeout / 1000}s]`)
            } else if (error.code !== undefined) {
              parts.push(`[exit code: ${error.code}]`)
            } else {
              parts.push(`[error: ${error.message}]`)
            }
          }

          let result = parts.length > 0 ? parts.join('\n') : '(no output)'

          if (result.length > maxOutput) {
            result = result.slice(0, maxOutput) + `\n... (truncated, ${result.length} total chars)`
          }

          console.log(`[run-bash] Done: ${result.length} chars, exit=${error?.code ?? 0}`)
          resolve(result)
        },
      )

      // Safety: kill if somehow the callback timeout doesn't fire
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, timeout + 2000)
    })
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
        preload: join(__dirname, 'preload.mjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    regionSelectorWin.setAlwaysOnTop(true, 'screen-saver')
    
    const query = new URLSearchParams({
      sourceId: source.id,
      displayId: source.displayId,
      sourceName: source.name,
      bounds: JSON.stringify(source.bounds),
      scaleFactor: source.scaleFactor.toString()
    }).toString();

    if (VITE_DEV_SERVER_URL) {
      regionSelectorWin.loadURL(`${VITE_DEV_SERVER_URL}region-selector.html?${query}`)
    } else {
      regionSelectorWin.loadFile(join(RENDERER_DIST, 'region-selector.html'), { search: query })
    }
    
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
