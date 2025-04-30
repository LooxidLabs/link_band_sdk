const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');

const SERVICE_LABEL = 'com.linkband.runserver';

let mainWindow: typeof BrowserWindow | null = null;
let tray: typeof Tray | null = null;

function checkServiceStatus() {
  return new Promise((resolve) => {
    exec(`launchctl list | grep ${SERVICE_LABEL}`, (error, stdout) => {
      if (error || !stdout) {
        resolve({ running: false });
      } else {
        resolve({ running: true });
      }
    });
  });
}

function startService() {
  return new Promise((resolve) => {
    exec(`launchctl start ${SERVICE_LABEL}`, (error, stdout, stderr) => {
      if (error) {
        resolve({ started: false, error: stderr || error.message });
      } else {
        resolve({ started: true });
      }
    });
  });
}

function isServiceRegistered() {
  return new Promise((resolve) => {
    exec(`launchctl list | grep ${SERVICE_LABEL}`, (error, stdout) => {
      resolve(!!stdout);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Initially hidden
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the index.html from a url in development or the local file in production
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Prevent window from being closed
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
    return false;
  });

  if (process.platform === 'darwin') {
    mainWindow.on('show', () => {
      app.dock.show();
    });
    mainWindow.on('hide', () => {
      app.dock.hide();
    });
  }

  // Handle IPC messages from renderer
  ipcMain.on('toMain', (event, data) => {
    console.log('Received from renderer:', data);
    // Process the data and send response back
    mainWindow?.webContents.send('fromMain', { response: 'Message received!' });
  });

  // IPC for service status
  ipcMain.handle('check-runserver-status', async () => {
    const registered = await isServiceRegistered();
    if (!registered) return { running: false, error: '서비스가 등록되어 있지 않습니다.' };
    return await checkServiceStatus();
  });
  ipcMain.handle('start-runserver-service', async () => {
    const registered = await isServiceRegistered();
    if (!registered) return { running: false, started: false, error: '서비스가 등록되어 있지 않습니다. 등록 후 다시 시도하세요.' };
    const result = (await startService()) || {};
    const status = (await checkServiceStatus()) || {};
    return { ...status, ...result };
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'trayIcon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        mainWindow?.show();
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Link Band SDK');
  tray.setContextMenu(contextMenu);

  // Double click to show window
  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// Initialize isQuitting property
app.isQuitting = false;

app.whenReady().then(() => {
  createWindow();
  createTray();

  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'assets', 'dockIcon.png'));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 