// This ensures the file is treated as a module.
export {};

// Import actual types for better type safety
import type { SearchParams, FileInfo, ExportParams, ExportHistory } from '../types/data-center';

// Python Server Control Types
interface ServerStatus {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port: number;
  uptime?: number;
  lastError?: string;
  logs: string[];
}

interface ServerControlResponse {
  success: boolean;
  message: string;
  status?: ServerStatus;
} 

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, func: (...args: any[]) => void) => () => void;
        removeAllListeners: (channel: string) => void;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
        openPath: (path: string) => Promise<string>;
      };
      dataCenter: {
        exportSession: (sessionId: string) => Promise<any>;
        openSessionFolder: (sessionId: string) => Promise<any>;
        searchFiles: (params: any) => Promise<any>;
        exportDataRaw: (params: any) => Promise<any>;
        openSpecificFile: (fileId: any) => Promise<any>;
      };
      store: {
        getSavedCredentials: () => Promise<any>;
        setSavedCredentials: (credentials: any) => Promise<boolean>;
        clearSavedCredentials: () => Promise<boolean>;
      };
      updater: {
        onUpdateChecking: (callback: () => void) => () => void;
        onUpdateAvailable: (callback: (info: any) => void) => () => void;
        onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
        onUpdateError: (callback: (error: any) => void) => () => void;
        onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void;
        onUpdateDownloaded: (callback: (info: any) => void) => () => void;
        checkForUpdates: () => Promise<any>;
        quitAndInstall: () => Promise<void>;
      };
      pythonServer: {
        start: () => Promise<ServerControlResponse>;
        stop: () => Promise<ServerControlResponse>;
        restart: () => Promise<ServerControlResponse>;
        getStatus: () => Promise<ServerStatus>;
        onStatusChange: (callback: (status: ServerStatus) => void) => () => void;
        onLog: (callback: (log: string) => void) => () => void;
        onReady: (callback: () => void) => () => void;
        onStopped: (callback: (info: { code: number; signal?: string }) => void) => () => void;
      };
    };
  }
} 