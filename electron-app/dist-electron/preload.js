"use strict";
const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Send messages to main process
    send: (channel, data) => {
        // Whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    // Receive messages from main process
    receive: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (event, data) => func(data));
        }
    },
    // Remove listener
    removeListener: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func);
        }
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
//# sourceMappingURL=preload.js.map