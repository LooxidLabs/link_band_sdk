import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => ipcRenderer.send(channel, data),
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      const subscription = (event: any, ...args: any[]) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription); // Return a cleanup function
    },
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url),
    openPath: (path: string) => shell.openPath(path), // Already exposed, good.
  },
  // Specific handlers for data center operations
  dataCenter: {
    exportSession: (sessionId: string) => ipcRenderer.invoke('export-session', sessionId),
    openSessionFolder: (sessionId: string) => ipcRenderer.invoke('open-session-folder', sessionId),
    searchFiles: (params: any) => ipcRenderer.invoke('search-files', params),
    exportDataRaw: (params: any) => ipcRenderer.invoke('export-data-raw', params),
    openSpecificFile: (fileId: any) => ipcRenderer.invoke('open-specific-file', fileId),
  },
  store: {
    getSavedCredentials: () => ipcRenderer.invoke('get-saved-credentials'),
    setSavedCredentials: (credentials: any) => ipcRenderer.invoke('set-saved-credentials', credentials),
    clearSavedCredentials: () => ipcRenderer.invoke('clear-saved-credentials'),
  }
}); 