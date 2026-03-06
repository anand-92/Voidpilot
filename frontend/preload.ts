import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
})
