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
    },
    // Update related APIs
    updater: {
        onUpdateChecking: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-checking', callback);
            return unsubscribe;
        },
        onUpdateAvailable: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-available', (_, info) => callback(info));
            return unsubscribe;
        },
        onUpdateNotAvailable: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-not-available', (_, info) => callback(info));
            return unsubscribe;
        },
        onUpdateError: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-error', (_, error) => callback(error));
            return unsubscribe;
        },
        onUpdateDownloadProgress: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
            return unsubscribe;
        },
        onUpdateDownloaded: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('update-downloaded', (_, info) => callback(info));
            return unsubscribe;
        },
        checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
        quitAndInstall: () => electron_1.ipcRenderer.invoke('quit-and-install'),
    },
    // Python Server Control APIs
    pythonServer: {
        start: () => electron_1.ipcRenderer.invoke('start-python-server'),
        stop: () => electron_1.ipcRenderer.invoke('stop-python-server'),
        restart: () => electron_1.ipcRenderer.invoke('restart-python-server'),
        getStatus: () => electron_1.ipcRenderer.invoke('get-python-server-status'),
        onStatusChange: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('python-server-status', (_, status) => callback(status));
            return unsubscribe;
        },
        onLog: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('python-log', (_, log) => callback(log));
            return unsubscribe;
        },
        onReady: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('python-server-ready', callback);
            return unsubscribe;
        },
        onStopped: (callback) => {
            const unsubscribe = electron_1.ipcRenderer.on('python-server-stopped', (_, info) => callback(info));
            return unsubscribe;
        }
    }
});
