export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail?: unknown;
  display_id?: string;
  appIcon?: unknown;
}

export interface IElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<DesktopCapturerSource[]>;
  executeMidsceneAction: (args: { action: string }) => Promise<string>;
  interruptMidscene: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
