import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams, exec } from 'child_process';
import Store from 'electron-store';
import axios from 'axios';
import fsExtra from 'fs-extra';
import * as os from 'os';


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

// Function to check if a port is in use
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new (require('net').Socket)();
    
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, 'localhost');
  });
}

// Function to kill process on port (macOS/Linux)
function killProcessOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Windows command
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          resolve(false);
          return;
        }
        
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[1].includes(`:${port}`)) {
            const pid = parts[4];
            exec(`taskkill /PID ${pid} /F`, (killError) => {
              resolve(!killError);
              return;
            });
          }
        }
        resolve(false);
      });
    } else {
      // macOS/Linux command
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout) {
          resolve(false);
          return;
        }
        
        const pids = stdout.trim().split('\n');
        if (pids.length > 0 && pids[0]) {
          exec(`kill -9 ${pids[0]}`, (killError) => {
            console.log(`Killed process ${pids[0]} on port ${port}`);
            resolve(!killError);
          });
        } else {
          resolve(false);
        }
      });
    }
  });
}

const PROTOCOL_SCHEME = 'linkbandapp';
const store = new Store({
  defaults: {
    savedCredentials: null
  }
});

// Define the backend API base URL (replace with your actual URL if different)
// It's good practice to get this from an environment variable or config
const API_BASE_URL = process.env.VITE_LINK_ENGINE_SERVER_URL || 'http://127.0.0.1:8121';

// Define a type for the backend's prepare-export response
interface PrepareExportResponse {
  status: string;
  message?: string;
  zip_filename?: string;
  download_url?: string;
  full_server_zip_path?: string;
}

// Function to get the default export directory path for each OS
function getDefaultExportPath(): string {
  const appName = 'LinkBand';
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      // Windows: %APPDATA%/LinkBand/Exports
      return path.join(app.getPath('userData'), 'Exports');
    
    case 'darwin':
      // macOS: ~/Library/Application Support/LinkBand/Exports
      return path.join(app.getPath('userData'), 'Exports');
    
    case 'linux':
      // Linux: ~/.config/LinkBand/Exports or $XDG_CONFIG_HOME/LinkBand/Exports
      return path.join(app.getPath('userData'), 'Exports');
    
    default:
      // Fallback to userData/Exports for other platforms
      return path.join(app.getPath('userData'), 'Exports');
  }
}

// Function to ensure the default export directory exists
async function ensureDefaultExportDirectory(): Promise<{ success: boolean; path: string; error?: string }> {
  try {
    const defaultPath = getDefaultExportPath();
    
    // Check if directory exists
    const exists = await fsExtra.pathExists(defaultPath);
    
    if (!exists) {
      // Create directory with full permissions
      await fsExtra.ensureDir(defaultPath);
      console.log(`Created default export directory: ${defaultPath}`);
    } else {
      console.log(`Default export directory already exists: ${defaultPath}`);
    }
    
    // Verify the directory is writable
    try {
      await fsExtra.access(defaultPath, fs.constants.W_OK);
    } catch (accessError) {
      return {
        success: false,
        path: defaultPath,
        error: 'Directory exists but is not writable'
      };
    }
    
    return {
      success: true,
      path: defaultPath
    };
    
  } catch (error: any) {
    console.error('Error ensuring default export directory:', error);
    return {
      success: false,
      path: getDefaultExportPath(),
      error: error.message || 'Failed to create directory'
    };
  }
}

function showWindow() {
  if (win && !win.isVisible()) {
    win.show();
    win.focus();
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'LINK BAND SDK',
    icon: path.join(__dirname, 'appIcon.png'), // Add custom icon
    show: true, // Show window immediately
    center: true, // Center the window on screen
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // 외부 CSS 로드를 위해 웹 보안 비활성화
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



// Tray functionality disabled for standalone desktop app
// function createTray() {
//   // Tray functionality removed for standard desktop app behavior
// }

function updateServerStatus(newStatus: Partial<ServerStatus>) {
  serverStatus = { ...serverStatus, ...newStatus };
  if (serverStatus.status === 'running' && serverStartTime) {
    serverStatus.uptime = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
  }
  
  // Safe window communication - check if window exists and is not destroyed
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    try {
      win.webContents.send('python-server-status', serverStatus);
    } catch (error: any) {
      console.log('Failed to send server status to renderer (window may be closing):', error.message);
    }
  }
}

function addServerLog(log: string) {
  serverStatus.logs.push(`[${new Date().toISOString()}] ${log}`);
  // Keep only last 100 logs
  if (serverStatus.logs.length > 100) {
    serverStatus.logs = serverStatus.logs.slice(-100);
  }
}

// Function to start the Python server
async function startPythonServer(): Promise<ServerControlResponse> {
  return new Promise(async (resolve) => {
    if (pythonProcess) {
      console.log('Python server is already running');
      resolve({ success: false, message: 'Python server is already running', status: serverStatus });
      return;
    }

    // Prevent multiple simultaneous start attempts
    if (serverStatus.status === 'starting') {
      console.log('Python server is already starting, rejecting duplicate request');
      resolve({ success: false, message: 'Python server is already starting', status: serverStatus });
      return;
    }

    try {
      console.log('Starting Python server...');
      
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
      
      updateServerStatus({ status: 'starting', lastError: undefined });
      serverStartTime = new Date();
    
      let pythonPath: string;
      let pythonExecutable: string;
    
      if (isDev) {
        // Development mode - use relative paths and virtual environment python
        pythonPath = path.join(__dirname, '../../python_core/run_server.py');
        
        // Try to use virtual environment python first - different paths for different OS
        let venvPython: string;
        if (process.platform === 'win32') {
          venvPython = path.join(__dirname, '../../python_core/venv/Scripts/python.exe');
        } else {
          venvPython = path.join(__dirname, '../../python_core/venv/bin/python3');
        }
        
        if (fs.existsSync(venvPython)) {
          pythonExecutable = venvPython;
          console.log('Found virtual environment Python:', venvPython);
        } else {
          console.log('Virtual environment not found at:', venvPython);
          // Fallback to system python - try multiple options for Windows
          if (process.platform === 'win32') {
            // Try different Python commands on Windows
            const pythonOptions = ['python3', 'python', 'py'];
            pythonExecutable = 'python3'; // Default fallback
            
            // Check which Python command is available
            for (const pyCmd of pythonOptions) {
              try {
                const { execSync } = require('child_process');
                execSync(`${pyCmd} --version`, { stdio: 'ignore' });
                pythonExecutable = pyCmd;
                console.log(`Found system Python: ${pyCmd}`);
                break;
              } catch (error) {
                console.log(`${pyCmd} not available`);
              }
            }
          } else {
            pythonExecutable = 'python3';
          }
        }
      } else {
        // Production mode - use standalone Python server
        const resourcesPath = process.resourcesPath;
        
        // Determine which standalone server to use based on architecture
        const arch = process.arch;
        let serverName: string;
        
        if (process.platform === 'darwin') {
          if (arch === 'arm64') {
            serverName = 'linkband-server-macos-arm64-final';
          } else {
            serverName = 'linkband-server-macos-x64';
          }
        } else if (process.platform === 'win32') {
          serverName = 'linkband-server-windows.exe';
        } else {
          serverName = 'linkband-server-linux';
        }
        
        pythonExecutable = path.join(resourcesPath, serverName);
        pythonPath = ''; // No script path needed for standalone executable
        
        console.log('Using standalone Python server:', pythonExecutable);
        console.log('Architecture:', arch);
        console.log('Platform:', process.platform);
      }
    
    console.log('Starting Python server from:', pythonPath || 'standalone executable');
    console.log('Using Python executable:', pythonExecutable);
    console.log('Development mode:', isDev);
    console.log('Resources path:', process.resourcesPath);
    
    // Check if ports are in use and free them if necessary
    const wsPort = 18765;
    const apiPort = 8121;
    
    if (await isPortInUse(wsPort)) {
      console.log(`WebSocket port ${wsPort} is in use, attempting to free it...`);
      await killProcessOnPort(wsPort);
      // Wait a moment for the port to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (await isPortInUse(apiPort)) {
      console.log(`API port ${apiPort} is in use, attempting to free it...`);
      await killProcessOnPort(apiPort);
      // Wait a moment for the port to be freed
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Check if executable exists (only for absolute paths)
    if (path.isAbsolute(pythonExecutable) && !fs.existsSync(pythonExecutable)) {
      console.error(`Python executable not found at: ${pythonExecutable}`);
      updateServerStatus({ status: 'error', lastError: `Python executable not found: ${pythonExecutable}` });
      resolve({ success: false, message: `Python executable not found: ${pythonExecutable}`, status: serverStatus });
      return;
    }
    
    // For system commands (relative paths), try to verify they exist
    if (!path.isAbsolute(pythonExecutable)) {
      try {
        const { execSync } = require('child_process');
        execSync(`${pythonExecutable} --version`, { stdio: 'ignore' });
        console.log(`Verified system Python command: ${pythonExecutable}`);
      } catch (error) {
        console.error(`Python command not available: ${pythonExecutable}`);
        updateServerStatus({ status: 'error', lastError: `Python command not available: ${pythonExecutable}` });
        resolve({ success: false, message: `Python command not available: ${pythonExecutable}`, status: serverStatus });
        return;
      }
    }
    
    // Check if Python script exists (only for development mode)
    if (isDev && pythonPath && !fs.existsSync(pythonPath)) {
      console.error(`Python script not found at: ${pythonPath}`);
      updateServerStatus({ status: 'error', lastError: `Python script not found: ${pythonPath}` });
      resolve({ success: false, message: `Python script not found: ${pythonPath}`, status: serverStatus });
      return;
    }
    
    // Make sure the standalone executable has execute permissions (macOS/Linux)
    if (!isDev && (process.platform === 'darwin' || process.platform === 'linux')) {
      try {
        fs.chmodSync(pythonExecutable, 0o755);
        console.log('Set execute permissions for standalone server');
      } catch (error) {
        console.warn('Could not set execute permissions:', error);
      }
    }
    
      // Set up environment for bundled Python
      const pythonEnv = { ...process.env };
      
      if (!isDev) {
        // Production mode - set up environment for bundled Python
        const venvPath = path.join(process.resourcesPath, 'python_core', 'venv');
        const pythonCoreDir = path.join(process.resourcesPath, 'python_core');
        
        // Set VIRTUAL_ENV
        pythonEnv.VIRTUAL_ENV = venvPath;
        
        // Set PYTHONPATH to include python_core directory
        pythonEnv.PYTHONPATH = pythonCoreDir;
        
        // Clear PYTHONHOME to avoid conflicts
        delete pythonEnv.PYTHONHOME;
        
        // Disable user site packages
        pythonEnv.PYTHONNOUSERSITE = '1';
        
        // Don't write bytecode
        pythonEnv.PYTHONDONTWRITEBYTECODE = '1';
        
        // Set PATH to prioritize virtual environment
        const binPath = process.platform === 'win32' 
          ? path.join(venvPath, 'Scripts')
          : path.join(venvPath, 'bin');
        pythonEnv.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;
      }
      
      // Prepare spawn arguments
      const spawnArgs = isDev && pythonPath ? [pythonPath] : [];
      const cwd = isDev && pythonPath ? path.dirname(pythonPath) : path.dirname(pythonExecutable);
      
      pythonProcess = spawn(pythonExecutable, spawnArgs, {
        cwd: cwd,
        env: pythonEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });
      
      if (pythonProcess.pid) {
        updateServerStatus({ pid: pythonProcess.pid });
    }

    pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('Python server output:', output);
      addServerLog(output);
      
      // Safe window communication for logs
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send('python-log', output);
        } catch (error: any) {
          console.log('Failed to send log to renderer (window may be closing):', error.message);
        }
      }

        // Check for server ready
      if (output.includes('WebSocket server initialized') || 
          output.includes('Link Band SDK Server ready!') ||
          output.includes('Application startup complete')) {
        console.log('Python server is ready');
        updateServerStatus({ status: 'running' });
        
        // Safe window communication for server ready
        if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
          try {
            win.webContents.send('python-server-ready');
          } catch (error: any) {
            console.log('Failed to send server ready to renderer (window may be closing):', error.message);
          }
        }
        
        resolve({ success: true, message: 'Python server started successfully', status: serverStatus });
      }
    });

    pythonProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      console.error('Python server error:', error);
      addServerLog(`ERROR: ${error}`);
      updateServerStatus({ lastError: error });
      
      // Safe window communication for error logs
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send('python-log', `ERROR: ${error}`);
        } catch (error: any) {
          console.log('Failed to send error log to renderer (window may be closing):', error.message);
        }
      }
    });

    pythonProcess.on('close', (code) => {
      console.log('Python server stopped with code:', code);
      pythonProcess = null;
      serverStartTime = null;
      updateServerStatus({ status: 'stopped', pid: undefined, uptime: undefined });
      
      // Safe window communication for server stopped
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send('python-server-stopped', { code, signal: null });
        } catch (error: any) {
          console.log('Failed to send server stopped to renderer (window may be closing):', error.message);
        }
      }
      
      // Auto-restart if server crashed unexpectedly (exit code 1 indicates port conflict)
      if (code === 1 && serverStatus.status !== 'stopping') {
        console.log('Python server crashed unexpectedly, attempting restart in 3 seconds...');
        setTimeout(async () => {
          try {
            console.log('Attempting to restart Python server...');
            const result = await startPythonServer();
            if (result.success) {
              console.log('Python server restarted successfully');
            } else {
              console.error('Failed to restart Python server:', result.message);
            }
          } catch (error) {
            console.error('Error during Python server restart:', error);
          }
        }, 3000);
      }
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
      
    } catch (error: any) {
      console.error('Error starting Python server:', error);
      pythonProcess = null;
      serverStartTime = null;
      updateServerStatus({ status: 'error', lastError: error.message, pid: undefined });
      resolve({ success: false, message: `Failed to start Python server: ${error.message}`, status: serverStatus });
    }
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
  // Set app name for menu bar
  app.setName('Link Band SDK');
  
  // Set Dock icon for macOS
  if (process.platform === 'darwin' && app.dock) {
    const dockIconPath = path.join(__dirname, 'appIcon.png');
    app.dock.setIcon(dockIconPath);
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' http://127.0.0.1:8121 ws://127.0.0.1:18765; " +
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

  // Ensure default export directory exists
  ensureDefaultExportDirectory().then(result => {
    if (result.success) {
      console.log('Default export directory ready:', result.path);
    } else {
      console.error('Failed to create default export directory:', result.error);
    }
  }).catch(error => {
    console.error('Error setting up default export directory:', error);
  });

  // Start Python server on app startup with delay to ensure stability
  setTimeout(() => {
    startPythonServer().then(result => {
      console.log('Python server startup result:', result);
    }).catch(error => {
      console.error('Failed to start Python server on startup:', error);
    });
  }, 2000); // 2 second delay to let the app fully initialize

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


ipcMain.handle('quit-and-install', async () => {
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

// Get default export path IPC handler
ipcMain.handle('get-default-export-path', async () => {
  try {
    const result = await ensureDefaultExportDirectory();
    return {
      success: result.success,
      path: result.path,
      error: result.error
    };
  } catch (error: any) {
    console.error('Error getting default export path:', error);
    return {
      success: false,
      path: getDefaultExportPath(),
      error: error.message || 'Failed to get default export path'
    };
  }
});

// Directory selection handler
ipcMain.handle('select-directory', async (event) => {
  try {
    console.log('select-directory handler called');
    const currentWindow = BrowserWindow.getFocusedWindow() || win;
    if (!currentWindow) {
      console.error('No focused window available for directory dialog.');
      return { canceled: true, filePaths: [] };
    }

    console.log('Showing open dialog...');
    const result = await dialog.showOpenDialog(currentWindow, {
      properties: ['openDirectory', 'dontAddToRecent'],
      title: 'Select Export Path',
      buttonLabel: 'Select Folder',
      message: 'Choose a folder for exporting data'
    });

    console.log('Dialog result:', JSON.stringify(result, null, 2));
    console.log('Result canceled:', result.canceled);
    console.log('Result filePaths:', result.filePaths);
    console.log('FilePaths length:', result.filePaths ? result.filePaths.length : 'undefined');

    // 사용자가 취소한 경우
    if (result.canceled) {
      console.log('User canceled the dialog');
      return { canceled: true, filePaths: [] };
    }

    // filePaths 배열이 있고 비어있지 않은 경우
    if (result.filePaths && Array.isArray(result.filePaths) && result.filePaths.length > 0) {
      console.log('Selected path:', result.filePaths[0]);
      const finalResult = {
        canceled: false,
        filePaths: result.filePaths
      };
      console.log('Returning result:', JSON.stringify(finalResult, null, 2));
      return finalResult;
    }

    // 여기에 도달한다는 것은 사용자가 취소하지 않았지만 filePaths가 비어있다는 뜻
    // 이는 macOS의 알려진 버그입니다
    console.warn('macOS dialog bug detected - filePaths is empty but not canceled');
    
    // 기본 Downloads 폴더를 대안으로 제공
    const downloadsPath = app.getPath('downloads');
    console.log('Offering alternative path:', downloadsPath);
    
    const alternativeResult = {
      canceled: false,
      filePaths: [downloadsPath],
      isAlternative: true
    };
    console.log('Returning alternative result:', JSON.stringify(alternativeResult, null, 2));
    return alternativeResult;

  } catch (error: any) {
    console.error('Error showing directory dialog:', error);
    return { canceled: true, filePaths: [] };
  }
});

// Markdown file reading handler
ipcMain.handle('read-markdown-file', async (event, filePath: string) => {
  try {
    let fullPath: string;
    
    if (app.isPackaged) {
      // 프로덕션 모드: extraResources에서 읽기
      fullPath = path.join(process.resourcesPath, 'docs', filePath);
    } else {
      // 개발 모드: public 폴더에서 읽기
      fullPath = path.join(__dirname, '../public/docs', filePath);
    }
    
    console.log(`Reading markdown file from: ${fullPath}`);
    
    if (await fsExtra.pathExists(fullPath)) {
      const content = await fsExtra.readFile(fullPath, 'utf8');
      return { success: true, content };
    } else {
      console.error(`Markdown file not found: ${fullPath}`);
      return { success: false, error: `File not found: ${filePath}` };
    }
  } catch (error: any) {
    console.error(`Error reading markdown file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

// Get default data path handler
ipcMain.handle('get-default-data-path', async (event) => {
  try {
    let dataPath: string;
    
    if (app.isPackaged) {
      // 프로덕션 모드: 앱 번들 내부의 python_core/data 경로
      dataPath = path.join(process.resourcesPath, 'python_core', 'data');
    } else {
      // 개발 모드: 프로젝트 루트 기준으로 electron-app/data
      const projectRoot = path.resolve(__dirname, '../../');
      dataPath = path.join(projectRoot, 'electron-app', 'data');
    }
    
    // 디렉토리가 없으면 생성
    await fsExtra.ensureDir(dataPath);
    
    return dataPath;
  } catch (error: any) {
    console.error('Error getting default data path:', error);
    return './data';
  }
});

async function getSessionDataPath(sessionId: string): Promise<string | null> {
  try {
    console.log(`[getSessionDataPath] Fetching data for session: ${sessionId}`);
    console.log(`[getSessionDataPath] API URL: ${API_BASE_URL}/data/sessions/${sessionId}`);
    const response = await axios.get<any>(`${API_BASE_URL}/data/sessions/${sessionId}`);
    console.log(`[getSessionDataPath] Response status: ${response.status}`);
    console.log(`[getSessionDataPath] Response data:`, response.data);
    
    if (response.data && typeof response.data.data_path === 'string') {
      console.log(`[getSessionDataPath] Found data_path: ${response.data.data_path}`);
      return response.data.data_path;
    }
    console.error('[getSessionDataPath] Failed to get data_path from session response or data_path is not a string:', response.data);
    return null;
  } catch (error: any) {
    console.error(`[getSessionDataPath] Error fetching session data for ${sessionId}:`, error);
    if (error.response) {
      console.error(`[getSessionDataPath] Response status: ${error.response.status}`);
      console.error(`[getSessionDataPath] Response data:`, error.response.data);
    }
    return null;
  }
}

ipcMain.handle('open-session-folder', async (event, sessionId: string) => {
  if (!sessionId) {
    return { success: false, message: 'Session ID is required.' };
  }
  console.log(`[IPC] Received open-session-folder request for session ID: ${sessionId}`);

  const sessionDataPathFromBackend = await getSessionDataPath(sessionId); 

  if (sessionDataPathFromBackend && typeof sessionDataPathFromBackend === 'string') {
    let absoluteDataPath: string;
    
    // 백엔드에서 반환하는 경로가 이미 절대 경로인지 확인
    if (path.isAbsolute(sessionDataPathFromBackend)) {
      // 이미 절대 경로인 경우 그대로 사용
      absoluteDataPath = sessionDataPathFromBackend;
    } else {
      // 상대 경로인 경우에만 기존 로직 적용
      if (app.isPackaged) {
        // 프로덕션 모드: 앱 번들 내부의 python_core 경로 사용
        const resourcesPath = process.resourcesPath;
        absoluteDataPath = path.join(resourcesPath, 'python_core', sessionDataPathFromBackend);
      } else {
        // 개발 모드: 프로젝트 루트 기준으로 경로 설정
        const projectRoot = path.resolve(__dirname, '../../'); 
        
        // 개발 모드에서는 electron-app/data에 저장되므로 경로 조정
        const sessionName = sessionDataPathFromBackend.split('/').pop(); // session_XXX 부분만 추출
        if (sessionName) {
          absoluteDataPath = path.join(projectRoot, 'electron-app', 'data', sessionName);
        } else {
          // sessionName을 추출할 수 없는 경우 원본 경로 사용
          absoluteDataPath = path.join(projectRoot, 'python_core', sessionDataPathFromBackend);
        }
        
        // 만약 electron-app/data에 없다면 python_core/data도 확인
        if (!await fsExtra.pathExists(absoluteDataPath)) {
          absoluteDataPath = path.join(projectRoot, 'python_core', sessionDataPathFromBackend);
        }
      }
    }

    console.log(`[IPC] Backend session data path: ${sessionDataPathFromBackend}`);
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
    const errorMessage = `Could not retrieve or validate data path for session ${sessionId}. Path from backend: ${sessionDataPathFromBackend}`;
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

// Directory validation handler
ipcMain.handle('check-directory', async (event, pathToCheck: string) => {
  try {
    console.log('check-directory handler called with path:', pathToCheck);
    
    const fs = await import('fs');
    const pathModule = await import('path');
    
    // 상대 경로를 절대 경로로 변환
    const absolutePath = pathModule.resolve(pathToCheck);
    console.log('Resolved absolute path:', absolutePath);
    
    try {
      const stats = await fs.promises.stat(absolutePath);
      
      if (stats.isDirectory()) {
        // 쓰기 권한 확인
        try {
          await fs.promises.access(absolutePath, fs.constants.W_OK);
          console.log('Directory exists and is writable');
          return {
            exists: true,
            isDirectory: true,
            writable: true,
            path: absolutePath
          };
        } catch (writeError) {
          console.log('Directory exists but is not writable');
          return {
            exists: true,
            isDirectory: true,
            writable: false,
            path: absolutePath
          };
        }
      } else {
        console.log('Path exists but is not a directory');
        return {
          exists: true,
          isDirectory: false,
          writable: false,
          path: absolutePath
        };
      }
    } catch (statError) {
      console.log('Path does not exist');
      return {
        exists: false,
        isDirectory: false,
        writable: false,
        path: absolutePath
      };
    }
  } catch (error: any) {
    console.error('Error checking directory:', error);
    return {
      exists: false,
      isDirectory: false,
      writable: false,
      error: error.message
    };
  }
});
