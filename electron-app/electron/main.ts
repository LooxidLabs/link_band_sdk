import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
let pythonProcess: ChildProcessWithoutNullStreams | null = null;

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // 수정된 경로: dist 폴더의 index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index from:', indexPath);
    win.loadFile(indexPath);
    // 프로덕션 환경에서도 디버깅을 위해 개발자 도구 활성화
    win.webContents.openDevTools();
  }

  // 창을 닫아도 종료하지 않고 숨김 처리
  win.on('close', (event) => {
    if (quitting) {
      win = null;
    } else {
      event.preventDefault();
      win?.hide();
    }
  });

  // IPC 이벤트 리스너 등록
  ipcMain.on('show-window', () => {
    console.log('Received show-window event');  // 디버깅용 로그 추가
    showWindow();
  });
}

function createTray() {
  let iconPath;
  if (process.env.NODE_ENV === 'development') {
    iconPath = path.join(__dirname, '../resources/trayIcon.png');
  } else {
    iconPath = path.join(__dirname, 'trayIcon.png');
  }

  // 아이콘 파일이 없으면 기본 아이콘 생성
  if (!fs.existsSync(iconPath)) {
    console.warn('Tray icon not found at:', iconPath, 'Using default icon');
    const defaultIcon = nativeImage.createEmpty();
    defaultIcon.resize({
      width: 16,
      height: 16
    });
    tray = new Tray(defaultIcon);
  } else {
    const trayIcon = nativeImage.createFromPath(iconPath);
    // macOS에서는 템플릿 이미지 사용
    if (process.platform === 'darwin') {
      trayIcon.setTemplateImage(true);
    }
    tray = new Tray(trayIcon);
  }

  tray.setToolTip('Link Band SDK');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Window',
      click: () => {
        if (win) {
          if (win.isVisible()) {
            win.hide();
          } else {
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
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // macOS에서는 더블클릭으로 윈도우 표시/숨김
  if (process.platform === 'darwin') {
    tray.on('double-click', () => {
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });
  } else {
    // 다른 플랫폼에서는 싱글 클릭으로 처리
    tray.on('click', () => {
      if (win) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });
  }
}

function startPythonServer() {
  if (pythonProcess) {
    return; // 이미 실행 중이면 중복 실행 방지
  }
  const scriptPath = path.join(__dirname, '../../python_core/run_server.py');
  if (!fs.existsSync(scriptPath)) {
    console.error('Python server script not found:', scriptPath);
    return;
  }
  pythonProcess = spawn('python3', [scriptPath], {
    cwd: path.dirname(scriptPath),
    env: process.env,
  });

  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('[PYTHON]', msg);
    win?.webContents.send('python-log', msg);
  });
  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    console.error('[PYTHON]', msg);
    win?.webContents.send('python-log', msg);
  });
  pythonProcess.on('close', (code) => {
    console.log(`[PYTHON] exited with code ${code}`);
    win?.webContents.send('python-log', `[PYTHON] exited with code ${code}`);
    pythonProcess = null;
  });
}

function stopPythonServer() {
  if (pythonProcess) {
    pythonProcess.kill();
    pythonProcess = null;
  }
}

// 서비스 시작 시 Python 서버 실행 (예: 앱 시작 시 자동 실행)
app.whenReady().then(() => {
  createWindow();
  createTray();
  startPythonServer();
});

app.on('window-all-closed', () => {
  // 창이 모두 닫혀도 앱을 종료하지 않음 (macOS 스타일)
});

app.on('activate', () => {
  if (win === null) createWindow();
});

// 개발자 도구에서 로그 확인을 위해 ipcMain 이벤트도 추가 가능
// win.webContents.on('ipc-message', (event, channel, ...args) => { ... });
