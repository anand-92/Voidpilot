export interface IElectronAPI {
  ping: () => Promise<string>;
  getDesktopSources: () => Promise<unknown[]>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
