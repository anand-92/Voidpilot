export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail?: any;
  display_id?: string;
  appIcon?: any;
}

export interface IElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<DesktopCapturerSource[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
