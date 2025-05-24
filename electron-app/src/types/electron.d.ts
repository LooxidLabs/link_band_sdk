declare global {
  interface Window {
    electron: {
      store: {
        getSavedCredentials: () => Promise<any>;
        setSavedCredentials: (credentials: any) => Promise<boolean>;
        clearSavedCredentials: () => Promise<boolean>;
      };
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        send(channel: string, ...args: any[]): void;
        on(channel: string, func: (...args: any[]) => void): void;
        once(channel: string, func: (...args: any[]) => void): void;
        removeListener(channel: string, func: (...args: any[]) => void): void;
      };
    };
  }
} 