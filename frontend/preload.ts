import { ipcRenderer, contextBridge } from 'electron'

export interface RegionBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface DesktopSource {
  id: string
  name: string
  displayId: string
  isPrimary: boolean
  bounds: RegionBounds
  scaleFactor: number
}

export interface RegionSelectionResult {
  sourceId: string
  displayId: string
  region: RegionBounds
}

export interface ElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<DesktopSource[]>;
  openRegionSelector: (source: DesktopSource) => Promise<RegionSelectionResult | null>;
  setMidsceneDisplay: (displayId?: string) => Promise<{ ok: true }>;
  executeMidsceneAction: (args: unknown) => Promise<unknown>;
  interruptMidscene: () => Promise<void>;
  runBash: (args: { command: string; timeout?: number }) => Promise<string>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  openRegionSelector: (source: DesktopSource) => ipcRenderer.invoke('open-region-selector', source),
  setMidsceneDisplay: (displayId?: string) => ipcRenderer.invoke('set-midscene-display', displayId),
  executeMidsceneAction: (args: unknown) => ipcRenderer.invoke('execute-midscene-action', args),
  interruptMidscene: () => ipcRenderer.invoke('interrupt-midscene'),
  runBash: (args: { command: string; timeout?: number }) => ipcRenderer.invoke('run-bash', args),
})
