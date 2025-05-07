"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, ...args) => {
            electron_1.ipcRenderer.send(channel, ...args);
        },
        on: (channel, func) => {
            electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        once: (channel, func) => {
            electron_1.ipcRenderer.once(channel, (event, ...args) => func(...args));
        },
        removeListener: (channel, func) => {
            electron_1.ipcRenderer.removeListener(channel, func);
        }
    }
});
