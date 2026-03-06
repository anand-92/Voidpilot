import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, screen } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { agentFromComputer } from '@midscene/computer'

let midsceneAgent: Awaited<ReturnType<typeof agentFromComputer>> | null = null;

const __dirname = dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let ghostCursorWin: BrowserWindow | null = null

async function requestPermissions() {
  if (process.platform === 'darwin') {
    const screenPrivilege = systemPreferences.getMediaAccessStatus('screen');
    if (screenPrivilege !== 'granted') {
      console.log('Screen recording privilege not granted. Trying to prompt...');
    }
    const accessibilityPrivilege = systemPreferences.isTrustedAccessibilityClient(false);
    if (!accessibilityPrivilege) {
      console.log('Accessibility privilege not granted.');
      systemPreferences.isTrustedAccessibilityClient(true);
    }
    const micPrivilege = systemPreferences.getMediaAccessStatus('microphone');
    if (micPrivilege !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
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

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
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
    webPreferences: { nodeIntegration: false, contextIsolation: true }
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
    ghostCursorWin = null
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

  // Initialize Midscene with Gemini 3.1 Pro Preview
  process.env.MIDSCENE_MODEL_NAME = 'gemini-3.1-pro-preview'
  process.env.MIDSCENE_USE_GEMINI = '1'
  if (process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = process.env.GOOGLE_API_KEY
    process.env.OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'
  }

  
let midsceneIsActive = false;
let isPlanning = false;
let currentMidsceneResolve: ((value: unknown) => void) | null = null;
let currentMidsceneReject: ((reason?: any) => void) | null = null;

function setupMidsceneAgent() {
  if (!midsceneAgent) return;
  midsceneAgent.addDumpUpdateListener((dumpStr, executionDump) => {
    if (!ghostCursorWin || !executionDump || !executionDump.tasks) return;
    
    let targetCenter: [number, number] | null = null;
    
    const tasks = executionDump.tasks;
    for (let i = tasks.length - 1; i >= 0; i--) {
      const task = tasks[i];
      
      if (task.output && typeof task.output === 'object' && 'element' in task.output && (task.output as any).element) {
        const el = (task.output as any).element;
        if (el.center) targetCenter = el.center;
        break;
      }

      if (task.type === 'Action Space' && task.param && typeof task.param === 'object') {
        const param = task.param as any;
        if (param.center) targetCenter = param.center;
      }
      
      if (!targetCenter && task.output && typeof task.output === 'object' && 'actions' in task.output) {
         const actions = (task.output as any).actions;
         if (Array.isArray(actions) && actions.length > 0) {
           const lastAction = actions[actions.length - 1];
           if (lastAction && lastAction.param) {
             if (lastAction.param.bbox && Array.isArray(lastAction.param.bbox)) {
               const bbox = lastAction.param.bbox;
               if (bbox.length === 4) {
                 targetCenter = [ (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2 ];
                 break;
               }
             }
           }
         }
      }
      if (targetCenter) break;
    }
    
    const runningTask = tasks.find((t: any) => t.status === 'running');
    const isRunning = !!runningTask;
    
    if (runningTask) {
      if (runningTask.type === 'Planning') {
        isPlanning = true;
      } else {
        isPlanning = false;
      }
    } else {
      isPlanning = false;
    }
    
    if (isRunning && targetCenter && Array.isArray(targetCenter) && targetCenter.length === 2) {
      const x = Math.round(targetCenter[0] - 30);
      const y = Math.round(targetCenter[1] - 30);
      
      ghostCursorWin.setBounds({ x, y, width: 60, height: 60 });
      if (!ghostCursorWin.isVisible()) {
        ghostCursorWin.showInactive();
      }
    } else if (!isRunning && ghostCursorWin.isVisible()) {
      ghostCursorWin.hide();
    }
  });
}

function abortMidscene(reason: string) {
  if (!midsceneIsActive) return;
  console.log('Action sequence aborted due to interrupt:', reason);
  
  if (midsceneAgent) {
    midsceneAgent.destroy();
    midsceneAgent = null;
  }
  
  midsceneIsActive = false;
  isPlanning = false;
  
  if (currentMidsceneReject) {
    currentMidsceneReject(new Error('Action sequence aborted due to interrupt: ' + reason));
    currentMidsceneReject = null;
    currentMidsceneResolve = null;
  }
  
  agentFromComputer().then(agent => {
    midsceneAgent = agent;
    setupMidsceneAgent();
    console.log('Midscene re-initialized after interrupt');
  }).catch(err => {
    console.error('Failed to re-initialize midscene:', err);
  });
}


  try {
    midsceneAgent = await agentFromComputer();
    console.log('Midscene ready');
    setupMidsceneAgent();
  } catch (error) {
    console.error('Failed to initialize Midscene:', error);
  }

  // Handle midscene action from renderer
  ipcMain.handle('execute-midscene-action', async (_, args) => {
    if (!midsceneAgent) {
      throw new Error('Midscene not initialized');
    }
    console.log('Tool call received in main process:', args);
    midsceneIsActive = true;
    
    return new Promise((resolve, reject) => {
      currentMidsceneResolve = resolve;
      currentMidsceneReject = reject;
      
      midsceneAgent!.action(args.action).then((result) => {
        if (!midsceneIsActive) return;
        midsceneIsActive = false;
        console.log('Midscene action completed', result);
        resolve("Action executed successfully");
      }).catch((err) => {
        if (!midsceneIsActive) return;
        midsceneIsActive = false;
        console.error('Midscene action failed', err);
        reject(err);
      });
    });
  });

  ipcMain.handle('interrupt-midscene', () => {
    abortMidscene('User spoke (interrupt trigger)');
  });

  let lastMousePos = screen.getCursorScreenPoint();
  setInterval(() => {
    if (midsceneIsActive && isPlanning) {
      const currentPos = screen.getCursorScreenPoint();
      const dist = Math.hypot(currentPos.x - lastMousePos.x, currentPos.y - lastMousePos.y);
      if (dist > 15) {
        abortMidscene('Physical mouse movement detected');
      }
      lastMousePos = currentPos;
    } else {
      lastMousePos = screen.getCursorScreenPoint();
    }
  }, 100);


  // Expose desktopCapturer to renderer via IPC (to get sources)
  ipcMain.handle('get-desktop-sources', async () => {
    return await desktopCapturer.getSources({ types: ['window', 'screen'] })
  })

  // IPC handlers for ping
  ipcMain.handle('ping', () => 'pong')

  createWindow()
  createGhostCursorWindow()
})
