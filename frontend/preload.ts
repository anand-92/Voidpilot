import { ipcRenderer, contextBridge } from 'electron'

export interface ElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<any>;
  executeMidsceneAction: (args: unknown) => Promise<unknown>;
  interruptMidscene: () => Promise<void>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  executeMidsceneAction: (args: unknown) => ipcRenderer.invoke('execute-midscene-action', args),
  interruptMidscene: () => ipcRenderer.invoke('interrupt-midscene'),
})
