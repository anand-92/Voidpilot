export interface IElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
