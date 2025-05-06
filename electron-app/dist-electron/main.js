var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import_electron = require("electron");
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const SERVICE_LABEL = "com.linkband.runserver";
let mainWindow = null;
let tray = null;
const gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(() => {
    createWindow();
    setupTray();
  });
}
function checkServiceStatus() {
  return new Promise((resolve) => {
    (0, import_child_process.exec)(`launchctl list | grep ${SERVICE_LABEL}`, (error, stdout) => {
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
    (0, import_child_process.exec)(`launchctl start ${SERVICE_LABEL}`, (error, stdout, stderr) => {
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
    (0, import_child_process.exec)(`launchctl list | grep ${SERVICE_LABEL}`, (error, stdout) => {
      resolve(!!stdout);
    });
  });
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
    // 초기에는 숨김 상태로 시작
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (process.platform === "darwin") {
    const icon = import_electron.nativeImage.createFromPath(path.join(__dirname, "../assets/icon.png"));
    import_electron.app.dock.setIcon(icon);
  }
  import_electron.ipcMain.on("toMain", (event, data) => {
    console.log("Received from renderer:", data);
    mainWindow == null ? void 0 : mainWindow.webContents.send("fromMain", { response: "Message received!" });
  });
  import_electron.ipcMain.handle("check-runserver-status", async () => {
    const registered = await isServiceRegistered();
    if (!registered) return { running: false, error: "\uC11C\uBE44\uC2A4\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." };
    return await checkServiceStatus();
  });
  import_electron.ipcMain.handle("start-runserver-service", async () => {
    const registered = await isServiceRegistered();
    if (!registered) return { running: false, started: false, error: "\uC11C\uBE44\uC2A4\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB4F1\uB85D \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." };
    const result = await startService() || {};
    const status = await checkServiceStatus() || {};
    return { ...status, ...result };
  });
}
function setupTray() {
  const icon = import_electron.nativeImage.createFromPath(path.join(__dirname, "../assets/icon.png")).resize({ width: 16, height: 16 });
  tray = new import_electron.Tray(icon);
  const contextMenu = import_electron.Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow == null ? void 0 : mainWindow.show();
      }
    },
    {
      label: "Quit",
      click: () => {
        import_electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("Link Band SDK");
  tray.setContextMenu(contextMenu);
  if (process.platform === "darwin") {
    tray.on("click", () => {
      tray == null ? void 0 : tray.popUpContextMenu();
    });
  }
}
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
import_electron.app.on("before-quit", async () => {
  if (mainWindow) {
    await mainWindow.webContents.session.clearStorageData({
      storages: ["indexdb"]
    });
    mainWindow.destroy();
    mainWindow = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});
