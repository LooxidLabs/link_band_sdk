// This ensures the file is treated as a module.
export {};

// Import actual types for better type safety
import type { SearchParams, FileInfo, ExportParams, ExportHistory } from '../types/data-center';

// Forward declaring types used in dataCenter, assuming they are imported or defined elsewhere
// For a real scenario, ensure these types (SearchParams, FileInfo, ExportParams, ExportHistory) are accessible here.
// For this example, we'll assume they are globally available or placeholder for structure.
// Consider importing them if they are in separate files: 
// import type { SearchParams, FileInfo, ExportParams, ExportHistory } from './data-center'; 

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data: any) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
        on: (channel: string, func: (...args: any[]) => void) => (() => void);
        once: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
      shell: {
        openExternal: (url: string) => Promise<void>;
        openPath: (path: string) => Promise<string>;
      };
      dataCenter: { 
        exportSession: (sessionId: string) => Promise<{ success: boolean; message?: string; exportPath?: string }>;
        openSessionFolder: (sessionId: string) => Promise<{ success: boolean; message?: string }>;
        searchFiles: (params: SearchParams) => Promise<{ files: FileInfo[] }>;
        exportDataRaw: (params: ExportParams) => Promise<ExportHistory>;
        openSpecificFile: (filePath: string) => Promise<{success: boolean; message?: string}>;
      };
      store: { 
        getSavedCredentials: () => Promise<any>;
        setSavedCredentials: (credentials: any) => Promise<boolean>;
        clearSavedCredentials: () => Promise<boolean>;
      };
    };
  }
} 