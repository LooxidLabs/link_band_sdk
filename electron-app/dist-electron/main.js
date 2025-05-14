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
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
    });
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
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
        }
        else {
            event.preventDefault();
            win?.hide();
        }
    });
    // IPC 이벤트 리스너 등록
    electron_1.ipcMain.on('show-window', () => {
        console.log('Received show-window event'); // 디버깅용 로그 추가
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
    // 아이콘 파일이 없으면 기본 아이콘 생성
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
        // macOS에서는 템플릿 이미지 사용
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
    // macOS에서는 더블클릭으로 윈도우 표시/숨김
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
        // 다른 플랫폼에서는 싱글 클릭으로 처리
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
        // Python 서버 로그를 renderer로 전달
        win?.webContents.send('python-log', output);
        // WebSocket 서버가 초기화되면 renderer에 알림
        if (output.includes('WebSocket server initialized')) {
            console.log('Python server is ready');
            win?.webContents.send('python-server-ready');
        }
    });
    pythonProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        // console.error('Python server error:', error);
        // 에러 로그도 renderer로 전달
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
// macOS에서 open-url 이벤트 핸들러
electron_1.app.on('open-url', (event, url) => {
    event.preventDefault(); // 기본 동작 방지
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === 'auth' && parsedUrl.searchParams.has('token')) {
            const token = parsedUrl.searchParams.get('token');
            // 렌더러 프로세스에 토큰 전달
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
// Windows/Linux에서 이미 앱 인스턴스가 실행 중일 때 두 번째 인스턴스로 URL 전달 처리
// app.requestSingleInstanceLock() 호출이 필요합니다.
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', (event, commandLine, workingDirectory) => {
        // commandLine 배열에서 URL을 찾습니다.
        // 사용자가 두 번째 인스턴스를 시작하려고 할 때 mainWindow가 존재하면 포커스합니다.
        if (win) {
            if (win.isMinimized())
                win.restore();
            win.focus();
        }
        // commandLine은 일반적으로 [electron 실행 파일 경로, 현재 디렉토리, 전달된 URL] 형태입니다.
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
                    // mainWindow가 로드된 후 토큰을 보내도록 보장
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
                    // TODO: mainWindow가 없을 때 토큰을 임시 저장했다가 나중에 보내는 로직 고려
                }
            }
        }
    }
    catch (e) {
        console.error('Failed to parse custom URL or extract token:', e);
    }
}
// 서비스 시작 시 Python 서버 실행 (예: 앱 시작 시 자동 실행)
electron_1.app.whenReady().then(() => {
    // 프로토콜 클라이언트 등록 (앱이 패키징된 후 macOS에서 처음 실행 시에만 효과가 있을 수 있음)
    // 개발 중에는 Info.plist 수동 설정 또는 재시작이 필요할 수 있음
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
    // 앱 시작 시 Python 서버 실행
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
// 웹 로그인 페이지를 여는 IPC 핸들러 (렌더러에서 요청 시)
electron_1.ipcMain.on('open-web-login', () => {
    // shell.openExternal('http://localhost:5173/login?from=electron');
    const loginWin = new electron_1.BrowserWindow({
        width: 600,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    loginWin.loadURL('http://localhost:5173/login?from=electron');
    // URL 변경 감지
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
// Python 서버 종료 IPC 핸들러
electron_1.ipcMain.on('stop-python-server', () => {
    stopPythonServer();
});
// 개발자 도구에서 로그 확인을 위해 ipcMain 이벤트도 추가 가능
// win.webContents.on('ipc-message', (event, channel, ...args) => { ... });
// Handle store operations
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
