import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  await requestPermissions()
  
  // Expose desktopCapturer to renderer via IPC (to get sources)
  ipcMain.handle('get-desktop-sources', async () => {
    return await desktopCapturer.getSources({ types: ['window', 'screen'] })
  })

  // IPC handlers for ping
  ipcMain.handle('ping', () => 'pong')

  createWindow()
})
