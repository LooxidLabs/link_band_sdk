"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronIPC', {
    send: (channel, ...args) => {
        electron_1.ipcRenderer.send(channel, ...args);
    },
    on: (channel, listener) => {
        // 이벤트 객체(event)를 제외하고 인자만 전달하도록 래핑할 수 있지만,
        // 리스너가 event 객체를 필요로 할 수도 있으므로 일단 그대로 전달합니다.
        // 원치 않으면 (event, ...args) => listener(...args) 형태로 수정 가능합니다.
        electron_1.ipcRenderer.on(channel, listener);
    },
    once: (channel, listener) => {
        electron_1.ipcRenderer.once(channel, listener);
    },
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    }
});
electron_1.contextBridge.exposeInMainWorld('electron', {
    store: {
        getSavedCredentials: () => electron_1.ipcRenderer.invoke('get-saved-credentials'),
        setSavedCredentials: (credentials) => electron_1.ipcRenderer.invoke('set-saved-credentials', credentials),
        clearSavedCredentials: () => electron_1.ipcRenderer.invoke('clear-saved-credentials'),
    },
});
