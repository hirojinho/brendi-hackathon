import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import url from 'url';

let overlayWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;

// Hide dock icon on macOS
if (process.platform === 'darwin') {
  app.dock.hide();
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 540,
    height: 120,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: false,
    show: false,
    skipTaskbar: true, // Hide from dock/taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Make window visible on all workspaces to prevent workspace switching
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  overlayWindow.loadURL(url.pathToFileURL(path.join(__dirname, '../overlay/index.html')).toString());

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Study Assistant',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the embedded web app from the bundled files
  const webAppPath = path.join(__dirname, 'web', 'index.html');
  mainWindow.loadFile(webAppPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerGlobalShortcut() {
  const shortcut = process.env.OVERLAY_SHORTCUT || 'CommandOrControl+Shift+Space';
  globalShortcut.register(shortcut, () => {
    if (!overlayWindow) return;
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow.center();
      overlayWindow.show();
      overlayWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createOverlayWindow();
  registerGlobalShortcut();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!overlayWindow) createOverlayWindow();
});

ipcMain.handle('open-main-window', async () => {
  createMainWindow();
  return true;
});


