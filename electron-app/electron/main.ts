import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { exec } from 'child_process';

const SERVICE_LABEL = 'com.linkband.runserver';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 단일 인스턴스 실행 보장
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 두 번째 인스턴스가 실행되면 기존 창을 활성화
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // 앱 초기화
  app.whenReady().then(() => {
    createWindow();
    setupTray();
  });
}

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false, // 초기에는 숨김 상태로 시작
  });

  // 개발 모드에서는 로컬 서버, 프로덕션에서는 빌드된 파일 로드
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 창이 준비되면 보여주기
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 창이 닫힐 때 이벤트
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // macOS에서 dock 아이콘 설정
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));
    app.dock.setIcon(icon);
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

function setupTray() {
  // 트레이 아이콘 생성
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'))
    .resize({ width: 16, height: 16 }); // macOS에서는 16x16이 권장됨
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Link Band SDK');
  tray.setContextMenu(contextMenu);

  // macOS에서 트레이 아이콘 클릭 시 메뉴 표시
  if (process.platform === 'darwin') {
    tray.on('click', () => {
      tray?.popUpContextMenu();
    });
  }
}

// 모든 창이 닫혔을 때
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 앱 종료 전 정리 작업
app.on('before-quit', async () => {
  if (mainWindow) {
    // IndexedDB 정리
    await mainWindow.webContents.session.clearStorageData({
      storages: ['indexdb']
    });
    
    // 창 닫기
    mainWindow.destroy();
    mainWindow = null;
  }
  
  // 트레이 아이콘 제거
  if (tray) {
    tray.destroy();
    tray = null;
  }
}); 