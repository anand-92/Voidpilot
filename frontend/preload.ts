import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  executeMidsceneAction: (args: unknown) => ipcRenderer.invoke('execute-midscene-action', args),
})
