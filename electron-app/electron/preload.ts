import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.on(channel, listener),
    removeListener: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.removeListener(channel, listener),
  },
  store: {
    getSavedCredentials: () => ipcRenderer.invoke('get-saved-credentials'),
    setSavedCredentials: (credentials: any) => ipcRenderer.invoke('set-saved-credentials', credentials),
    clearSavedCredentials: () => ipcRenderer.invoke('clear-saved-credentials'),
  }
}); 