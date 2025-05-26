"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => electron_1.ipcRenderer.send(channel, data),
        invoke: (channel, ...args) => electron_1.ipcRenderer.invoke(channel, ...args),
        on: (channel, func) => {
            const subscription = (event, ...args) => func(...args);
            electron_1.ipcRenderer.on(channel, subscription);
            return () => electron_1.ipcRenderer.removeListener(channel, subscription); // Return a cleanup function
        },
        removeAllListeners: (channel) => electron_1.ipcRenderer.removeAllListeners(channel),
    },
    shell: {
        openExternal: (url) => electron_1.shell.openExternal(url),
        openPath: (path) => electron_1.shell.openPath(path), // Already exposed, good.
    },
    // Specific handlers for data center operations
    dataCenter: {
        exportSession: (sessionId) => electron_1.ipcRenderer.invoke('export-session', sessionId),
        openSessionFolder: (sessionId) => electron_1.ipcRenderer.invoke('open-session-folder', sessionId),
        searchFiles: (params) => electron_1.ipcRenderer.invoke('search-files', params),
        exportDataRaw: (params) => electron_1.ipcRenderer.invoke('export-data-raw', params),
        openSpecificFile: (fileId) => electron_1.ipcRenderer.invoke('open-specific-file', fileId),
    },
    store: {
        getSavedCredentials: () => electron_1.ipcRenderer.invoke('get-saved-credentials'),
        setSavedCredentials: (credentials) => electron_1.ipcRenderer.invoke('set-saved-credentials', credentials),
        clearSavedCredentials: () => electron_1.ipcRenderer.invoke('clear-saved-credentials'),
    }
});
