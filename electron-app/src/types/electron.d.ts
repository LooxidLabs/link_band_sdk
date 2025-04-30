interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (data: any) => void) => void;
  removeListener: (channel: string, func: (data: any) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
} 