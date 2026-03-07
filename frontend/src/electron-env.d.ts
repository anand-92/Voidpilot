export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopCapturerSource {
  id: string;
  name: string;
  displayId: string;
  isPrimary: boolean;
  bounds: RegionBounds;
  scaleFactor: number;
}

export interface RegionSelectionResult {
  sourceId: string;
  displayId: string;
  region: RegionBounds;
}

export interface IElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<DesktopCapturerSource[]>;
  openRegionSelector: (source: DesktopCapturerSource) => Promise<RegionSelectionResult | null>;
  setMidsceneDisplay: (displayId?: string) => Promise<{ ok: true }>;
  executeMidsceneAction: (args: { action: string }) => Promise<string>;
  interruptMidscene: () => Promise<void>;
  runBash: (args: { command: string; timeout?: number }) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
