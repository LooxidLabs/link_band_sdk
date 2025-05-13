"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, ...args) => electron_1.ipcRenderer.send(channel, ...args),
        on: (channel, listener) => electron_1.ipcRenderer.on(channel, listener),
        removeListener: (channel, listener) => electron_1.ipcRenderer.removeListener(channel, listener),
    },
    store: {
        getSavedCredentials: () => electron_1.ipcRenderer.invoke('get-saved-credentials'),
        setSavedCredentials: (credentials) => electron_1.ipcRenderer.invoke('set-saved-credentials', credentials),
        clearSavedCredentials: () => electron_1.ipcRenderer.invoke('clear-saved-credentials'),
    }
});
