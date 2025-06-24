"use strict";
const { contextBridge, ipcRenderer, shell } = require('electron');
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, func) => {
            const subscription = (event, ...args) => func(...args);
            ipcRenderer.on(channel, subscription);
            return () => ipcRenderer.removeListener(channel, subscription); // Return a cleanup function
        },
        removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    },
    shell: {
        openExternal: (url) => shell.openExternal(url),
        openPath: (path) => shell.openPath(path), // Already exposed, good.
    },
    // Specific handlers for data center operations
    dataCenter: {
        exportSession: (sessionId) => ipcRenderer.invoke('export-session', sessionId),
        openSessionFolder: (sessionId) => ipcRenderer.invoke('open-session-folder', sessionId),
        searchFiles: (params) => ipcRenderer.invoke('search-files', params),
        exportDataRaw: (params) => ipcRenderer.invoke('export-data-raw', params),
        openSpecificFile: (fileId) => ipcRenderer.invoke('open-specific-file', fileId),
    },
    store: {
        getSavedCredentials: () => ipcRenderer.invoke('get-saved-credentials'),
        setSavedCredentials: (credentials) => ipcRenderer.invoke('set-saved-credentials', credentials),
        clearSavedCredentials: () => ipcRenderer.invoke('clear-saved-credentials'),
    },
    // Update related APIs
    updater: {
        onUpdateChecking: (callback) => {
            const unsubscribe = ipcRenderer.on('update-checking', callback);
            return unsubscribe;
        },
        onUpdateAvailable: (callback) => {
            const unsubscribe = ipcRenderer.on('update-available', (_, info) => callback(info));
            return unsubscribe;
        },
        onUpdateNotAvailable: (callback) => {
            const unsubscribe = ipcRenderer.on('update-not-available', (_, info) => callback(info));
            return unsubscribe;
        },
        onUpdateError: (callback) => {
            const unsubscribe = ipcRenderer.on('update-error', (_, error) => callback(error));
            return unsubscribe;
        },
        onUpdateDownloadProgress: (callback) => {
            const unsubscribe = ipcRenderer.on('update-download-progress', (_, progress) => callback(progress));
            return unsubscribe;
        },
        onUpdateDownloaded: (callback) => {
            const unsubscribe = ipcRenderer.on('update-downloaded', (_, info) => callback(info));
            return unsubscribe;
        },
        checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
        quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    },
    // File system operations
    fs: {
        readMarkdownFile: (filePath) => ipcRenderer.invoke('read-markdown-file', filePath),
        selectDirectory: () => ipcRenderer.invoke('select-directory'),
        getDefaultDataPath: () => ipcRenderer.invoke('get-default-data-path'),
        checkDirectory: (path) => ipcRenderer.invoke('check-directory', path),
    },
    // Python Server Control APIs
    pythonServer: {
        start: () => ipcRenderer.invoke('start-python-server'),
        stop: () => ipcRenderer.invoke('stop-python-server'),
        restart: () => ipcRenderer.invoke('restart-python-server'),
        getStatus: () => ipcRenderer.invoke('get-python-server-status'),
        onStatusChange: (callback) => {
            const unsubscribe = ipcRenderer.on('python-server-status', (_, status) => callback(status));
            return unsubscribe;
        },
        onLog: (callback) => {
            const unsubscribe = ipcRenderer.on('python-log', (_, log) => callback(log));
            return unsubscribe;
        },
        onReady: (callback) => {
            const unsubscribe = ipcRenderer.on('python-server-ready', callback);
            return unsubscribe;
        },
        onStopped: (callback) => {
            const unsubscribe = ipcRenderer.on('python-server-stopped', (_, info) => callback(info));
            return unsubscribe;
        }
    }
});
