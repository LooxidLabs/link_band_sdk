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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const electron_store_1 = __importDefault(require("electron-store"));
const axios_1 = __importDefault(require("axios"));
const fs_extra_1 = __importDefault(require("fs-extra"));
let win = null;
let tray = null;
let quitting = false;
let pythonProcess = null;
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
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading application from:', indexPath);
    win.loadFile(indexPath);
    if (process.env.NODE_ENV === 'development' || true) {
        win.webContents.openDevTools();
    }
    win.on('close', (event) => {
        if (quitting) {
            win = null;
        }
        else {
            event.preventDefault();
            win?.hide();
        }
    });
    electron_1.ipcMain.on('show-window', () => {
        console.log('Received show-window event');
        showWindow();
    });
}
function createTray() {
    let iconPath;
    if (process.env.NODE_ENV === 'development') {
        iconPath = path.join(__dirname, '../resources/trayIcon.png');
    }
    else {
        iconPath = path.join(__dirname, 'trayIcon.png');
    }
    if (!fs.existsSync(iconPath)) {
        console.warn('Tray icon not found at:', iconPath, 'Using default icon');
        const defaultIcon = electron_1.nativeImage.createEmpty();
        defaultIcon.resize({
            width: 16,
            height: 16
        });
        tray = new electron_1.Tray(defaultIcon);
    }
    else {
        const trayIcon = electron_1.nativeImage.createFromPath(iconPath);
        if (process.platform === 'darwin') {
            trayIcon.setTemplateImage(true);
        }
        tray = new electron_1.Tray(trayIcon);
    }
    tray.setToolTip('Link Band SDK');
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show/Hide Window',
            click: () => {
                if (win) {
                    if (win.isVisible()) {
                        win.hide();
                    }
                    else {
                        win.show();
                        win.focus();
                    }
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                quitting = true;
                stopPythonServer();
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
    if (process.platform === 'darwin') {
        tray.on('double-click', () => {
            if (win) {
                if (win.isVisible()) {
                    win.hide();
                }
                else {
                    win.show();
                    win.focus();
                }
            }
        });
    }
    else {
        tray.on('click', () => {
            if (win) {
                if (win.isVisible()) {
                    win.hide();
                }
                else {
                    win.show();
                    win.focus();
                }
            }
        });
    }
}
function startPythonServer() {
    if (pythonProcess) {
        console.log('Python server is already running');
        return;
    }
    const pythonPath = path.join(__dirname, '../../python_core/run_server.py');
    console.log('Starting Python server from:', pythonPath);
    pythonProcess = (0, child_process_1.spawn)('python3', [pythonPath], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    pythonProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Python server output:', output);
        win?.webContents.send('python-log', output);
        if (output.includes('WebSocket server initialized')) {
            console.log('Python server is ready');
            win?.webContents.send('python-server-ready');
        }
    });
    pythonProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        win?.webContents.send('python-log', `ERROR: ${error}`);
    });
    pythonProcess.on('close', (code) => {
        console.log('Python server stopped with code:', code);
        pythonProcess = null;
        win?.webContents.send('python-server-stopped');
    });
}
function stopPythonServer() {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
}
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
    createTray();
    if (!win) {
        createWindow();
    }
    startPythonServer();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
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
