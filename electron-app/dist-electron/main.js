"use strict";
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { exec } = require('child_process');
const SERVICE_LABEL = 'com.linkband.runserver';
let mainWindow = null;
let tray = null;
function checkServiceStatus() {
    return new Promise((resolve) => {
        exec(`launchctl list | grep ${SERVICE_LABEL}`, (error, stdout) => {
            if (error || !stdout) {
                resolve({ running: false });
            }
            else {
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
            }
            else {
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
        width: 450,
        height: 700,
        show: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    // Load the index.html from a url in development or the local file in production
    mainWindow.loadURL(isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, '../dist/index.html')}`);
    // Open the DevTools in development mode
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    // X 버튼 클릭 시 hide, Quit 메뉴 선택 시 종료
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide(); // hide로 변경
            if (process.platform === 'darwin') {
                app.dock.hide(); // macOS에서는 dock에서도 숨김
            }
            return false;
        }
    });
    // 창이 최소화되어도 dock에서 숨기지 않음
    if (process.platform === 'darwin') {
        mainWindow.on('show', () => {
            app.dock.show(); // 창이 다시 보일 때 dock에도 표시
        });
        mainWindow.on('minimize', () => {
            mainWindow?.show(); // 최소화 시도시 다시 보이게 함
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
        if (!registered)
            return { running: false, error: '서비스가 등록되어 있지 않습니다.' };
        return await checkServiceStatus();
    });
    ipcMain.handle('start-runserver-service', async () => {
        const registered = await isServiceRegistered();
        if (!registered)
            return { running: false, started: false, error: '서비스가 등록되어 있지 않습니다. 등록 후 다시 시도하세요.' };
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
                if (process.platform === 'darwin') {
                    app.dock.show();
                }
                mainWindow?.focus();
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
    // 트레이 아이콘 클릭으로 창 열기
    tray.on('click', () => {
        mainWindow?.show();
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        mainWindow?.focus();
    });
    // Double click도 동일하게 처리
    tray.on('double-click', () => {
        mainWindow?.show();
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        mainWindow?.focus();
    });
}
// Initialize isQuitting property
app.isQuitting = false;
// 앱이 실행될 때 dock에 표시
app.whenReady().then(() => {
    createWindow();
    createTray();
    if (process.platform === 'darwin') {
        app.dock.show(); // dock에 항상 표시
        app.dock.setIcon(path.join(__dirname, 'assets', 'dockIcon.png'));
    }
});
// 모든 창이 닫혔을 때의 동작
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.isQuitting = true;
        app.quit();
    }
});
// 앱 활성화 시 창이 없으면 새로 생성
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
    else if (!mainWindow.isVisible()) {
        mainWindow.show();
    }
});
//# sourceMappingURL=main.js.map