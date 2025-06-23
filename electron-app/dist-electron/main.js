"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const electron_store_1 = __importDefault(require("electron-store"));
const axios_1 = __importDefault(require("axios"));
const fs_extra_1 = __importDefault(require("fs-extra"));
let win = null;
// let tray: Tray | null = null; // Not needed for standalone app
// let quitting = false; // Not needed for standalone app
let pythonProcess = null;
let isQuitting = false; // Flag to track if app is quitting
let serverStatus = {
    status: 'stopped',
    port: 8121,
    logs: []
};
let serverStartTime = null;
const PROTOCOL_SCHEME = 'linkbandapp';
const store = new electron_store_1.default({
    defaults: {
        savedCredentials: null
    }
});
// Define the backend API base URL (replace with your actual URL if different)
// It's good practice to get this from an environment variable or config
const API_BASE_URL = process.env.VITE_LINK_ENGINE_SERVER_URL || 'http://localhost:8121';
function showWindow() {
    if (win && !win.isVisible()) {
        win.show();
        win.focus();
    }
}
function createWindow() {
    win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        title: 'LINK BAND SDK',
        show: true, // Show window immediately
        center: true, // Center the window on screen
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading application from:', indexPath);
    win.loadFile(indexPath);
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }
    win.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            gracefulShutdown();
        }
    });
    electron_1.ipcMain.on('show-window', () => {
        console.log('Received show-window event');
        showWindow();
    });
}
// Graceful shutdown function
async function gracefulShutdown() {
    if (isQuitting)
        return;
    isQuitting = true;
    console.log('Starting graceful shutdown...');
    try {
        // Stop Python server with timeout
        await stopPythonServerGracefully();
        // Close all windows
        electron_1.BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                window.destroy();
            }
        });
        // Quit the app
        electron_1.app.quit();
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        electron_1.app.quit();
    }
}
// Auto-updater configuration
function configureAutoUpdater() {
    // Configure autoUpdater
    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
    electron_updater_1.autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...');
        win?.webContents.send('update-checking');
    });
    electron_updater_1.autoUpdater.on('update-available', (info) => {
        console.log('Update available:', info);
        win?.webContents.send('update-available', info);
    });
    electron_updater_1.autoUpdater.on('update-not-available', (info) => {
        console.log('Update not available:', info);
        win?.webContents.send('update-not-available', info);
    });
    electron_updater_1.autoUpdater.on('error', (err) => {
        console.log('Error in auto-updater:', err);
        win?.webContents.send('update-error', err);
    });
    electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        console.log(log_message);
        win?.webContents.send('update-download-progress', progressObj);
    });
    electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
        console.log('Update downloaded:', info);
        win?.webContents.send('update-downloaded', info);
        // Show dialog to restart and install update
        const dialogOpts = {
            type: 'info',
            buttons: ['Restart', 'Later'],
            title: 'Application Update',
            message: 'A new version has been downloaded. Restart the application to apply the update?',
            detail: 'The update will be applied when you restart the application.'
        };
        electron_1.dialog.showMessageBox(dialogOpts).then((returnValue) => {
            if (returnValue.response === 0)
                electron_updater_1.autoUpdater.quitAndInstall();
        });
    });
    // IPC handlers for manual update check
    electron_1.ipcMain.handle('check-for-updates', async () => {
        try {
            const result = await electron_updater_1.autoUpdater.checkForUpdates();
            return result;
        }
        catch (error) {
            console.error('Error checking for updates:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('quit-and-install', () => {
        electron_updater_1.autoUpdater.quitAndInstall();
    });
}
// Tray functionality disabled for standalone desktop app
// function createTray() {
//   // Tray functionality removed for standard desktop app behavior
// }
function updateServerStatus(newStatus) {
    serverStatus = { ...serverStatus, ...newStatus };
    if (serverStatus.status === 'running' && serverStartTime) {
        serverStatus.uptime = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
    }
    win?.webContents.send('python-server-status', serverStatus);
}
function addServerLog(log) {
    serverStatus.logs.push(`[${new Date().toISOString()}] ${log}`);
    // Keep only last 100 logs
    if (serverStatus.logs.length > 100) {
        serverStatus.logs = serverStatus.logs.slice(-100);
    }
}
function startPythonServer() {
    return new Promise((resolve) => {
        if (pythonProcess) {
            console.log('Python server is already running');
            resolve({ success: false, message: 'Python server is already running', status: serverStatus });
            return;
        }
        const pythonPath = path.join(__dirname, '../../python_core/run_server.py');
        const venvPythonPath = path.join(__dirname, '../../venv/bin/python3');
        console.log('Starting Python server from:', pythonPath);
        console.log('Using Python from virtual environment:', venvPythonPath);
        updateServerStatus({ status: 'starting', lastError: undefined });
        serverStartTime = new Date();
        pythonProcess = (0, child_process_1.spawn)(venvPythonPath, [pythonPath], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        if (pythonProcess.pid) {
            updateServerStatus({ pid: pythonProcess.pid });
        }
        pythonProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('Python server output:', output);
            addServerLog(output);
            win?.webContents.send('python-log', output);
            if (output.includes('WebSocket server initialized')) {
                console.log('Python server is ready');
                updateServerStatus({ status: 'running' });
                win?.webContents.send('python-server-ready');
                resolve({ success: true, message: 'Python server started successfully', status: serverStatus });
            }
        });
        pythonProcess.stderr?.on('data', (data) => {
            const error = data.toString();
            console.error('Python server error:', error);
            addServerLog(`ERROR: ${error}`);
            updateServerStatus({ lastError: error });
            win?.webContents.send('python-log', `ERROR: ${error}`);
        });
        pythonProcess.on('close', (code) => {
            console.log('Python server stopped with code:', code);
            pythonProcess = null;
            serverStartTime = null;
            updateServerStatus({ status: 'stopped', pid: undefined, uptime: undefined });
            win?.webContents.send('python-server-stopped', { code, signal: null });
        });
        pythonProcess.on('error', (error) => {
            console.error('Python server error:', error);
            pythonProcess = null;
            serverStartTime = null;
            updateServerStatus({ status: 'error', lastError: error.message, pid: undefined });
            resolve({ success: false, message: `Failed to start Python server: ${error.message}`, status: serverStatus });
        });
        // Timeout for server start
        setTimeout(() => {
            if (serverStatus.status === 'starting') {
                resolve({ success: false, message: 'Python server start timeout', status: serverStatus });
            }
        }, 30000); // 30 second timeout
    });
}
// Improved Python server stopping with timeout
async function stopPythonServerGracefully() {
    return new Promise((resolve) => {
        if (!pythonProcess) {
            updateServerStatus({ status: 'stopped' });
            resolve({ success: true, message: 'Python server is already stopped', status: serverStatus });
            return;
        }
        console.log('Stopping Python server gracefully...');
        updateServerStatus({ status: 'stopping' });
        const timeout = setTimeout(() => {
            console.log('Python server shutdown timeout, force killing...');
            if (pythonProcess) {
                pythonProcess.kill('SIGKILL');
                pythonProcess = null;
                serverStartTime = null;
                updateServerStatus({ status: 'stopped', pid: undefined, uptime: undefined });
            }
            resolve({ success: true, message: 'Python server stopped (force killed)', status: serverStatus });
        }, 5000); // 5 second timeout
        pythonProcess.on('close', () => {
            clearTimeout(timeout);
            console.log('Python server stopped gracefully');
            pythonProcess = null;
            serverStartTime = null;
            updateServerStatus({ status: 'stopped', pid: undefined, uptime: undefined });
            resolve({ success: true, message: 'Python server stopped successfully', status: serverStatus });
        });
        pythonProcess.on('error', (error) => {
            clearTimeout(timeout);
            console.error('Error stopping Python server:', error);
            pythonProcess = null;
            serverStartTime = null;
            updateServerStatus({ status: 'error', lastError: error.message, pid: undefined });
            resolve({ success: false, message: `Error stopping Python server: ${error.message}`, status: serverStatus });
        });
        // Try graceful shutdown first
        pythonProcess.kill('SIGTERM');
    });
}
function stopPythonServer() {
    return stopPythonServerGracefully();
}
async function restartPythonServer() {
    console.log('Restarting Python server...');
    // Stop the server first
    const stopResult = await stopPythonServerGracefully();
    if (!stopResult.success) {
        return { success: false, message: `Failed to stop server: ${stopResult.message}`, status: serverStatus };
    }
    // Wait a moment before starting
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Start the server
    const startResult = await startPythonServer();
    return startResult;
}
function getPythonServerStatus() {
    if (serverStatus.status === 'running' && serverStartTime) {
        serverStatus.uptime = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
    }
    return { ...serverStatus };
}
// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process, just log the error
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault();
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'auth' && parsedUrl.searchParams.has('token')) {
            const token = parsedUrl.searchParams.get('token');
            if (win && win.webContents) {
                console.log('Sending token to renderer:', token);
                win.webContents.send('custom-token-received', token);
            }
        }
    }
    catch (e) {
        console.error('Failed to parse custom URL or extract token:', e);
    }
});
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (win) {
            if (win.isMinimized())
                win.restore();
            win.focus();
        }
        const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_SCHEME}://`));
        if (url) {
            handleCustomUrl(url);
        }
    });
}
function handleCustomUrl(url) {
    console.log('Received custom URL:', url);
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'auth' && parsedUrl.searchParams.has('token')) {
            const token = parsedUrl.searchParams.get('token');
            if (token) {
                console.log('Extracted token:', token);
                if (win && win.webContents) {
                    if (win.webContents.isLoading()) {
                        win.webContents.once('did-finish-load', () => {
                            win?.webContents.send('custom-token-received', token);
                        });
                    }
                    else {
                        win.webContents.send('custom-token-received', token);
                    }
                }
                else {
                    console.error('mainWindow is not available to send token.');
                }
            }
        }
    }
    catch (e) {
        console.error('Failed to parse custom URL or extract token:', e);
    }
}
electron_1.app.whenReady().then(() => {
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; " +
                        "script-src 'self'; " +
                        "style-src 'self' 'unsafe-inline'; " +
                        "connect-src 'self' http://localhost:8121 ws://localhost:18765; " +
                        "img-src 'self' data:;"
                ]
            }
        });
    });
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
    }
    createWindow();
    // Remove tray functionality for standalone desktop app
    // createTray();
    if (!win) {
        createWindow();
    }
    // Configure auto-updater after window is created
    configureAutoUpdater();
    // Start Python server on app startup
    startPythonServer().then(result => {
        console.log('Python server startup result:', result);
    }).catch(error => {
        console.error('Failed to start Python server on startup:', error);
    });
});
electron_1.app.on('window-all-closed', () => {
    // Standard desktop app behavior - quit when all windows are closed
    if (!isQuitting) {
        gracefulShutdown();
    }
});
electron_1.app.on('before-quit', async (event) => {
    if (!isQuitting) {
        event.preventDefault();
        await gracefulShutdown();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
electron_1.ipcMain.on('open-web-login', () => {
    const loginWin = new electron_1.BrowserWindow({
        width: 600,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    loginWin.loadURL('http://dev.linkcloud.co/login?from=electron');
    loginWin.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith('linkbandapp://')) {
            event.preventDefault();
            try {
                const parsedUrl = new URL(url);
                if (parsedUrl.hostname === 'auth' && parsedUrl.searchParams.has('token')) {
                    const token = parsedUrl.searchParams.get('token');
                    if (win && win.webContents) {
                        win.webContents.send('custom-token-received', token);
                    }
                }
            }
            catch (e) {
                console.error('Failed to parse custom URL or extract token:', e);
            }
            loginWin.close();
        }
    });
});
// Python Server Control IPC Handlers
electron_1.ipcMain.handle('start-python-server', async () => {
    try {
        return await startPythonServer();
    }
    catch (error) {
        return { success: false, message: `Failed to start server: ${error.message}`, status: serverStatus };
    }
});
electron_1.ipcMain.handle('stop-python-server', async () => {
    try {
        return await stopPythonServer();
    }
    catch (error) {
        return { success: false, message: `Failed to stop server: ${error.message}`, status: serverStatus };
    }
});
electron_1.ipcMain.handle('restart-python-server', async () => {
    try {
        return await restartPythonServer();
    }
    catch (error) {
        return { success: false, message: `Failed to restart server: ${error.message}`, status: serverStatus };
    }
});
electron_1.ipcMain.handle('get-python-server-status', async () => {
    return getPythonServerStatus();
});
// Legacy event handler for backward compatibility
electron_1.ipcMain.on('stop-python-server', () => {
    stopPythonServer();
});
electron_1.ipcMain.handle('get-saved-credentials', () => {
    return store.get('savedCredentials');
});
electron_1.ipcMain.handle('set-saved-credentials', (_, credentials) => {
    store.set('savedCredentials', credentials);
    return true;
});
electron_1.ipcMain.handle('clear-saved-credentials', () => {
    store.delete('savedCredentials');
    return true;
});
async function getSessionDataPath(sessionId) {
    try {
        const response = await axios_1.default.get(`${API_BASE_URL}/data/sessions/${sessionId}`);
        if (response.data && typeof response.data.data_path === 'string') {
            return response.data.data_path;
        }
        console.error('Failed to get data_path from session response or data_path is not a string:', response.data);
        return null;
    }
    catch (error) {
        console.error(`Error fetching session data for ${sessionId}:`, error);
        return null;
    }
}
electron_1.ipcMain.handle('open-session-folder', async (event, sessionId) => {
    if (!sessionId) {
        return { success: false, message: 'Session ID is required.' };
    }
    console.log(`[IPC] Received open-session-folder request for session ID: ${sessionId}`);
    const sessionRelativePathFromBackend = await getSessionDataPath(sessionId);
    if (sessionRelativePathFromBackend && typeof sessionRelativePathFromBackend === 'string') {
        const projectRoot = path.resolve(__dirname, '../../');
        // 백엔드가 "data/session_XYZ" 형태로 반환한다고 가정합니다.
        // 만약 백엔드가 "session_XYZ" (data/ 접두사 없이)만 반환한다면,
        // 아래 줄은 path.join(projectRoot, 'python_core', 'data', sessionRelativePathFromBackend)가 되어야 합니다.
        const absoluteDataPath = path.join(projectRoot, 'python_core', sessionRelativePathFromBackend);
        console.log(`[IPC] Backend session relative path: ${sessionRelativePathFromBackend}`);
        console.log(`[IPC] Assumed project root: ${projectRoot}`);
        console.log(`[IPC] Attempting to open absolute path: ${absoluteDataPath}`);
        try {
            if (await fs_extra_1.default.pathExists(absoluteDataPath)) {
                await electron_1.shell.openPath(absoluteDataPath);
                console.log(`[IPC] Successfully opened folder: ${absoluteDataPath}`);
                return { success: true, message: `Folder ${absoluteDataPath} opened.` };
            }
            else {
                console.error(`[IPC] Data path does not exist: ${absoluteDataPath}`);
                return { success: false, message: `Data path not found: ${absoluteDataPath}` };
            }
        }
        catch (error) {
            console.error(`[IPC] Error opening folder ${absoluteDataPath}: `, error);
            return { success: false, message: `Failed to open folder: ${error.message}` };
        }
    }
    else {
        const errorMessage = `Could not retrieve or validate data path for session ${sessionId}. Path from backend: ${sessionRelativePathFromBackend}`;
        console.error(`[IPC] ${errorMessage}`);
        return { success: false, message: errorMessage };
    }
});
electron_1.ipcMain.handle('export-session', async (event, sessionId) => {
    if (!sessionId) {
        return { success: false, message: 'Session ID is required.' };
    }
    const sessionName = sessionId;
    console.log(`Received export-session request for session name: ${sessionName}`);
    try {
        const prepareExportUrl = `${API_BASE_URL}/data/sessions/${sessionName}/prepare-export`;
        console.log(`Calling backend to prepare export: ${prepareExportUrl}`);
        const prepareResponse = await axios_1.default.post(prepareExportUrl);
        if (prepareResponse.data && prepareResponse.data.status === 'success') {
            const { zip_filename: zipFilename, download_url: downloadUrlPath } = prepareResponse.data;
            if (!zipFilename || !downloadUrlPath) {
                console.error('Backend did not return zip_filename or download_url:', prepareResponse.data);
                return { success: false, message: 'Failed to get export details from server.' };
            }
            const defaultSavePath = path.join(electron_1.app.getPath('downloads'), zipFilename);
            const currentWindow = electron_1.BrowserWindow.getFocusedWindow() || win;
            if (!currentWindow) {
                console.error('No focused window available for save dialog.');
                return { success: false, message: 'No active window to show save dialog.' };
            }
            const { filePath } = await electron_1.dialog.showSaveDialog(currentWindow, {
                title: 'Export Session Data',
                defaultPath: defaultSavePath,
                filters: [{ name: 'Zip Files', extensions: ['zip'] }],
            });
            if (filePath) {
                const fullDownloadUrl = `${API_BASE_URL}${downloadUrlPath}`;
                console.log(`User selected path: ${filePath}. Downloading from ${fullDownloadUrl}`);
                const writer = fs_extra_1.default.createWriteStream(filePath);
                const response = await (0, axios_1.default)({
                    method: 'get',
                    url: fullDownloadUrl,
                    responseType: 'stream',
                });
                const readableStream = response.data;
                readableStream.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', () => {
                        console.log(`Session ${sessionName} exported to ${filePath}`);
                        resolve({ success: true, message: `Session exported to ${filePath}`, exportPath: filePath });
                    });
                    writer.on('error', (err) => {
                        console.error(`Error writing downloaded zip file ${filePath}:`, err);
                        fs_extra_1.default.unlink(filePath).catch(e => console.error('Failed to delete partial file during cleanup:', e));
                        reject({ success: false, message: `Failed to save exported session: ${err.message}` });
                    });
                    readableStream.on('error', (err) => {
                        console.error(`Error downloading file stream from ${fullDownloadUrl}:`, err);
                        writer.close();
                        fs_extra_1.default.unlink(filePath).catch(e => console.error('Failed to delete partial file during stream error cleanup:', e));
                        reject({ success: false, message: `Failed to download session data: ${err.message}` });
                    });
                });
            }
            else {
                console.log('Export cancelled by user.');
                return { success: false, message: 'Export cancelled by user.' };
            }
        }
        else {
            console.error('Backend failed to prepare export:', prepareResponse.data);
            const errorMessage = prepareResponse.data?.message || 'Server failed to prepare export.';
            return { success: false, message: errorMessage };
        }
    }
    catch (error) {
        console.error(`Error exporting session ${sessionName}:`, error.response?.data || error.message);
        let detailMessage = 'Unknown error during export.';
        if (error.response && error.response.data && error.response.data.detail) {
            detailMessage = error.response.data.detail;
        }
        else if (error.message) {
            detailMessage = error.message;
        }
        return { success: false, message: `Failed to export session: ${detailMessage}` };
    }
});
electron_1.ipcMain.handle('open-specific-file', async (event, filePath) => {
    if (!filePath || typeof filePath !== 'string') {
        console.error('Invalid file path received for open-specific-file:', filePath);
        return { success: false, message: 'Valid file path is required.' };
    }
    try {
        if (await fs_extra_1.default.pathExists(filePath)) {
            await electron_1.shell.openPath(filePath);
            console.log(`Successfully opened: ${filePath}`);
            return { success: true, message: `Path ${filePath} opened.` };
        }
        else {
            console.error(`Path does not exist: ${filePath}`);
            return { success: false, message: `Path not found: ${filePath}` };
        }
    }
    catch (error) {
        console.error(`Error opening path ${filePath}: `, error);
        return { success: false, message: `Failed to open path: ${error.message}` };
    }
});
