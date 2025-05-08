import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronIPC', {
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    // 이벤트 객체(event)를 제외하고 인자만 전달하도록 래핑할 수 있지만,
    // 리스너가 event 객체를 필요로 할 수도 있으므로 일단 그대로 전달합니다.
    // 원치 않으면 (event, ...args) => listener(...args) 형태로 수정 가능합니다.
    ipcRenderer.on(channel, listener);
  },
  once: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.once(channel, listener);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

contextBridge.exposeInMainWorld('electron', {
  store: {
    getSavedCredentials: () => ipcRenderer.invoke('get-saved-credentials'),
    setSavedCredentials: (credentials: any) => ipcRenderer.invoke('set-saved-credentials', credentials),
    clearSavedCredentials: () => ipcRenderer.invoke('clear-saved-credentials'),
  },
}); 