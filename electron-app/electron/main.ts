import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import Store from 'electron-store';
import axios from 'axios';
import fsExtra from 'fs-extra';

type StoreSchema = {
  savedCredentials: {
    email: string;
    password: string;
    rememberMe: boolean;
  } | null;
}

let win: BrowserWindow | null = null;
// let tray: Tray | null = null; // Not needed for standalone app
// let quitting = false; // Not needed for standalone app
let pythonProcess: ChildProcessWithoutNullStreams | null = null;
let isQuitting = false; // Flag to track if app is quitting

// Server status tracking
interface ServerStatus {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  pid?: number;
  port: number;
  uptime?: number;
  lastError?: string;
  logs: string[];
}

interface ServerControlResponse {
  success: boolean;
  message: string;
  status?: ServerStatus;
}

let serverStatus: ServerStatus = {
  status: 'stopped',
  port: 8121,
  logs: []
};

let serverStartTime: Date | null = null;

const PROTOCOL_SCHEME = 'linkbandapp';
const store = new Store({
  defaults: {
    savedCredentials: null
  }
});

// Define the backend API base URL (replace with your actual URL if different)
// It's good practice to get this from an environment variable or config
const API_BASE_URL = process.env.VITE_LINK_ENGINE_SERVER_URL || 'http://localhost:8121';

// Define a type for the backend's prepare-export response
interface PrepareExportResponse {
  status: string;
  message?: string;
  zip_filename?: string;
  download_url?: string;
  full_server_zip_path?: string;
}

function showWindow() {
  if (win && !win.isVisible()) {
    win.show();
    win.focus();
  }
}

function createWindow() {
  win = new BrowserWindow({
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

  ipcMain.on('show-window', () => {
    console.log('Received show-window event');
    showWindow();
  });
}

// Graceful shutdown function
async function gracefulShutdown() {
  if (isQuitting) return;
  
  isQuitting = true;
  console.log('Starting graceful shutdown...');
  
  try {
    // Stop Python server with timeout
    await stopPythonServerGracefully();
    
    // Close all windows
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.destroy();
      }
    });
    
    // Quit the app
    app.quit();
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    app.quit();
  }
}

// Auto-updater configuration
function configureAutoUpdater() {
  // Configure autoUpdater
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
    win?.webContents.send('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    win?.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
    win?.webContents.send('update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater:', err);
    win?.webContents.send('update-error', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log(log_message);
    win?.webContents.send('update-download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    win?.webContents.send('update-downloaded', info);
    
    // Show dialog to restart and install update
    const dialogOpts = {
      type: 'info' as const,
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: 'A new version has been downloaded. Restart the application to apply the update?',
      detail: 'The update will be applied when you restart the application.'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
  });

  // IPC handlers for manual update check
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result;
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  });

  ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
  });
}

// Tray functionality disabled for standalone desktop app
// function createTray() {
//   // Tray functionality removed for standard desktop app behavior
// }

function updateServerStatus(newStatus: Partial<ServerStatus>) {
  serverStatus = { ...serverStatus, ...newStatus };
  if (serverStatus.status === 'running' && serverStartTime) {
    serverStatus.uptime = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
  }
  win?.webContents.send('python-server-status', serverStatus);
}

function addServerLog(log: string) {
  serverStatus.logs.push(`[${new Date().toISOString()}] ${log}`);
  // Keep only last 100 logs
  if (serverStatus.logs.length > 100) {
    serverStatus.logs = serverStatus.logs.slice(-100);
  }
}

function startPythonServer(): Promise<ServerControlResponse> {
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

    pythonProcess = spawn(venvPythonPath, [pythonPath], {
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
async function stopPythonServerGracefully(): Promise<ServerControlResponse> {
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

function stopPythonServer(): Promise<ServerControlResponse> {
  return stopPythonServerGracefully();
}

async function restartPythonServer(): Promise<ServerControlResponse> {
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

function getPythonServerStatus(): ServerStatus {
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

app.on('open-url', (event, url) => {
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
  } catch (e) {
    console.error('Failed to parse custom URL or extract token:', e);
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL_SCHEME}://`));
    if (url) {
      handleCustomUrl(url);
    }
  });
}

function handleCustomUrl(url: string) {
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
          } else {
            win.webContents.send('custom-token-received', token);
          }
        } else {
          console.error('mainWindow is not available to send token.');
        }
      }
    }
  } catch (e) {
    console.error('Failed to parse custom URL or extract token:', e);
  }
}

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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
      app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
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

app.on('window-all-closed', () => {
  // Standard desktop app behavior - quit when all windows are closed
  if (!isQuitting) {
    gracefulShutdown();
  }
});

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await gracefulShutdown();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('open-web-login', () => {
  const loginWin = new BrowserWindow({
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
      } catch (e) {
        console.error('Failed to parse custom URL or extract token:', e);
      }
      loginWin.close();
    }
  });
});

// Python Server Control IPC Handlers
ipcMain.handle('start-python-server', async (): Promise<ServerControlResponse> => {
  try {
    return await startPythonServer();
  } catch (error: any) {
    return { success: false, message: `Failed to start server: ${error.message}`, status: serverStatus };
  }
});

ipcMain.handle('stop-python-server', async (): Promise<ServerControlResponse> => {
  try {
    return await stopPythonServer();
  } catch (error: any) {
    return { success: false, message: `Failed to stop server: ${error.message}`, status: serverStatus };
  }
});

ipcMain.handle('restart-python-server', async (): Promise<ServerControlResponse> => {
  try {
    return await restartPythonServer();
  } catch (error: any) {
    return { success: false, message: `Failed to restart server: ${error.message}`, status: serverStatus };
  }
});

ipcMain.handle('get-python-server-status', async (): Promise<ServerStatus> => {
  return getPythonServerStatus();
});

// Legacy event handler for backward compatibility
ipcMain.on('stop-python-server', () => {
  stopPythonServer();
});

ipcMain.handle('get-saved-credentials', () => {
  return (store as any).get('savedCredentials');
});

ipcMain.handle('set-saved-credentials', (_, credentials) => {
  (store as any).set('savedCredentials', credentials);
  return true;
});

ipcMain.handle('clear-saved-credentials', () => {
  (store as any).delete('savedCredentials');
  return true;
});

async function getSessionDataPath(sessionId: string): Promise<string | null> {
  try {
    const response = await axios.get<any>(`${API_BASE_URL}/data/sessions/${sessionId}`);
    if (response.data && typeof response.data.data_path === 'string') {
      return response.data.data_path;
    }
    console.error('Failed to get data_path from session response or data_path is not a string:', response.data);
    return null;
  } catch (error: any) {
    console.error(`Error fetching session data for ${sessionId}:`, error);
    return null;
  }
}

ipcMain.handle('open-session-folder', async (event, sessionId: string) => {
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
      if (await fsExtra.pathExists(absoluteDataPath)) {
        await shell.openPath(absoluteDataPath);
        console.log(`[IPC] Successfully opened folder: ${absoluteDataPath}`);
        return { success: true, message: `Folder ${absoluteDataPath} opened.` };
      } else {
        console.error(`[IPC] Data path does not exist: ${absoluteDataPath}`);
        return { success: false, message: `Data path not found: ${absoluteDataPath}` };
      }
    } catch (error: any) {
      console.error(`[IPC] Error opening folder ${absoluteDataPath}: `, error);
      return { success: false, message: `Failed to open folder: ${error.message}` };
    }
  } else {
    const errorMessage = `Could not retrieve or validate data path for session ${sessionId}. Path from backend: ${sessionRelativePathFromBackend}`;
    console.error(`[IPC] ${errorMessage}`);
    return { success: false, message: errorMessage };
  }
});

ipcMain.handle('export-session', async (event, sessionId: string) => {
  if (!sessionId) {
    return { success: false, message: 'Session ID is required.' };
  }
  const sessionName = sessionId;
  console.log(`Received export-session request for session name: ${sessionName}`);

  try {
    const prepareExportUrl = `${API_BASE_URL}/data/sessions/${sessionName}/prepare-export`;
    console.log(`Calling backend to prepare export: ${prepareExportUrl}`);
    
    const prepareResponse = await axios.post<PrepareExportResponse>(prepareExportUrl);

    if (prepareResponse.data && prepareResponse.data.status === 'success') {
      const { zip_filename: zipFilename, download_url: downloadUrlPath } = prepareResponse.data;

      if (!zipFilename || !downloadUrlPath) {
        console.error('Backend did not return zip_filename or download_url:', prepareResponse.data);
        return { success: false, message: 'Failed to get export details from server.' };
      }

      const defaultSavePath = path.join(app.getPath('downloads'), zipFilename);
      const currentWindow = BrowserWindow.getFocusedWindow() || win;
      if (!currentWindow) {
        console.error('No focused window available for save dialog.');
        return { success: false, message: 'No active window to show save dialog.' };
      }

      const { filePath } = await dialog.showSaveDialog(currentWindow, { 
        title: 'Export Session Data',
        defaultPath: defaultSavePath,
        filters: [{ name: 'Zip Files', extensions: ['zip'] }],
      });

      if (filePath) {
        const fullDownloadUrl = `${API_BASE_URL}${downloadUrlPath}`;
        console.log(`User selected path: ${filePath}. Downloading from ${fullDownloadUrl}`);

        const writer = fsExtra.createWriteStream(filePath);
        const response = await axios({
          method: 'get',
          url: fullDownloadUrl,
          responseType: 'stream',
        });

        const readableStream = response.data as NodeJS.ReadableStream;
        readableStream.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', () => {
            console.log(`Session ${sessionName} exported to ${filePath}`);
            resolve({ success: true, message: `Session exported to ${filePath}`, exportPath: filePath });
          });
          writer.on('error', (err: any) => {
            console.error(`Error writing downloaded zip file ${filePath}:`, err);
            fsExtra.unlink(filePath).catch(e => console.error('Failed to delete partial file during cleanup:', e)); 
            reject({ success: false, message: `Failed to save exported session: ${err.message}` });
          });
          readableStream.on('error', (err: any) => { 
            console.error(`Error downloading file stream from ${fullDownloadUrl}:`, err);
            writer.close(); 
            fsExtra.unlink(filePath).catch(e => console.error('Failed to delete partial file during stream error cleanup:', e));
            reject({ success: false, message: `Failed to download session data: ${err.message}` });
          });
        });
      } else {
        console.log('Export cancelled by user.');
        return { success: false, message: 'Export cancelled by user.' };
      }
    } else {
      console.error('Backend failed to prepare export:', prepareResponse.data);
      const errorMessage = prepareResponse.data?.message || 'Server failed to prepare export.';
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    console.error(`Error exporting session ${sessionName}:`, error.response?.data || error.message);
    let detailMessage = 'Unknown error during export.';
    if (error.response && error.response.data && error.response.data.detail) {
      detailMessage = error.response.data.detail;
    } else if (error.message) {
      detailMessage = error.message;
    }
    return { success: false, message: `Failed to export session: ${detailMessage}` };
  }
});

ipcMain.handle('open-specific-file', async (event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') {
    console.error('Invalid file path received for open-specific-file:', filePath);
    return { success: false, message: 'Valid file path is required.' };
  }
  try {
    if (await fsExtra.pathExists(filePath)) {
      await shell.openPath(filePath);
      console.log(`Successfully opened: ${filePath}`);
      return { success: true, message: `Path ${filePath} opened.` };
    } else {
      console.error(`Path does not exist: ${filePath}`);
      return { success: false, message: `Path not found: ${filePath}` };
    }
  } catch (error: any) {
    console.error(`Error opening path ${filePath}: `, error);
    return { success: false, message: `Failed to open path: ${error.message}` };
  }
});
