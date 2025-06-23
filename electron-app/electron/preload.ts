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
  },
  // Update related APIs
  updater: {
    onUpdateChecking: (callback: () => void) => {
      const unsubscribe = ipcRenderer.on('update-checking', callback);
      return unsubscribe;
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      const unsubscribe = ipcRenderer.on('update-available', (_, info) => callback(info));
      return unsubscribe;
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const unsubscribe = ipcRenderer.on('update-not-available', (_, info) => callback(info));
      return unsubscribe;
    },
    onUpdateError: (callback: (error: any) => void) => {
      const unsubscribe = ipcRenderer.on('update-error', (_, error) => callback(error));
      return unsubscribe;
    },
    onUpdateDownloadProgress: (callback: (progress: any) => void) => {
      const unsubscribe = ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
      return unsubscribe;
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const unsubscribe = ipcRenderer.on('update-downloaded', (_, info) => callback(info));
      return unsubscribe;
    },
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  },
  // Python Server Control APIs
  pythonServer: {
    start: () => ipcRenderer.invoke('start-python-server'),
    stop: () => ipcRenderer.invoke('stop-python-server'), 
    restart: () => ipcRenderer.invoke('restart-python-server'),
    getStatus: () => ipcRenderer.invoke('get-python-server-status'),
    onStatusChange: (callback: (status: any) => void) => {
      const unsubscribe = ipcRenderer.on('python-server-status', (_, status) => callback(status));
      return unsubscribe;
    },
    onLog: (callback: (log: string) => void) => {
      const unsubscribe = ipcRenderer.on('python-log', (_, log) => callback(log));
      return unsubscribe;
    },
    onReady: (callback: () => void) => {
      const unsubscribe = ipcRenderer.on('python-server-ready', callback);
      return unsubscribe;
    },
    onStopped: (callback: (info: any) => void) => {
      const unsubscribe = ipcRenderer.on('python-server-stopped', (_, info) => callback(info));
      return unsubscribe;
    }
  }
}); 