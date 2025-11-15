import { app, BrowserWindow, BrowserWindowConstructorOptions, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import getPort from 'get-port';
import Store from 'electron-store';
import { initializeBackend } from './backend.js';

interface ConfigStore {
  openaiApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  [key: string]: any;
}

interface StoreInterface {
  get(key: string): any;
  set(key: string, value: any): void;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let overlayWindow: BrowserWindow | null = null;
let mainWindow: BrowserWindow | null = null;
let backendUrl: string | null = null;
let backendServer: any = null;
const configStore = new Store<ConfigStore>() as unknown as StoreInterface;

// Ensure userData directory exists
const userDataPath = app.getPath('userData');
app.setPath('userData', userDataPath);

async function startBackend() {
  const userDataPath = app.getPath('userData');
  
  // Override cwd so backend databases are created in userData
  const originalCwd = process.cwd();
  process.chdir(userDataPath);
  
  try {
    // Get available port
    const port = await getPort({ port: 3001 });
    
    // Load environment variables from store
    const envVars: Record<string, string> = {};
    const openaiKey = configStore.get('openaiApiKey') as string | undefined;
    const openrouterKey = configStore.get('openrouterApiKey') as string | undefined;
    const ollamaUrl = configStore.get('ollamaBaseUrl') as string | undefined;
    
    if (openaiKey) envVars.OPENAI_API_KEY = openaiKey;
    if (openrouterKey) envVars.OPENROUTER_API_KEY = openrouterKey;
    if (ollamaUrl) envVars.OLLAMA_BASE_URL = ollamaUrl;
    
    // Initialize backend
    const result = await initializeBackend(port, envVars);
    backendUrl = `http://127.0.0.1:${port}`;
    backendServer = result.app;
    
  } catch (error) {
    console.error('[Main] Failed to start backend:', error);
    backendUrl = null; // Ensure it's null on failure
    backendServer = null;
    throw error;
  } finally {
    // Restore original cwd if needed elsewhere
    process.chdir(originalCwd);
  }
}

function createOverlayWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs');
  
  overlayWindow = new BrowserWindow({
    width: 700,
    height: 520,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    visibleOnAllWorkspaces: false, // Stay on current workspace (Raycast-like behavior)
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Preload scripts need sandbox: false to use contextBridge
    },
    backgroundColor: '#00000000',
    visualEffectState: 'active',
  } as BrowserWindowConstructorOptions );

  // Load React app from renderer build
  const rendererPath = path.join(__dirname, '../renderer/index.html');
  overlayWindow.loadFile(rendererPath);
  
  // Check for preload errors
  overlayWindow.webContents.on('preload-error', (_event, _preloadPath, error) => {
    console.error('[Main] Preload script error:', error);
  });

  // Hide on blur (clicking outside) - Raycast-like behavior
  overlayWindow.on('blur', () => {
    overlayWindow?.hide();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function toggleOverlay() {
  if (!overlayWindow) {
    createOverlayWindow();
  }
  
  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      // Ensure window is on current workspace before showing (Raycast-like)
      overlayWindow.setVisibleOnAllWorkspaces(false, { visibleOnFullScreen: true });
      overlayWindow.center();
      overlayWindow.show();
      overlayWindow.focus();
      overlayWindow.moveTop(); // Ensure it's on top
    }
  }
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Study Assistant',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Load the embedded web app (React UI) from the bundled files
  // __dirname is dist/main/, so go up one level to dist/web/
  const webAppPath = path.join(__dirname, '..', 'web', 'index.html');
  console.log('[Main] Loading web app from:', webAppPath);
  mainWindow.loadFile(webAppPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('chat:send', async (_event, payload) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Chat error:', error);
    throw error;
  }
});

ipcMain.handle('note:create', async (_event, payload) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Note creation error:', error);
    throw error;
  }
});

ipcMain.handle('server:health', async () => {
  if (!backendUrl) {
    return { healthy: false, error: 'Backend not initialized' };
  }
  
  // If backendUrl is set, the backend should be running
  // (we set it only after successful initialization)
  return { healthy: true, url: backendUrl };
});

ipcMain.handle('overlay:toggle', () => {
  toggleOverlay();
});

ipcMain.handle('config:get', (_event, key: string) => {
  return configStore.get(key);
});

ipcMain.handle('config:set', (_event, key: string, value: any) => {
  configStore.set(key, value);
  
  // If API keys changed, backend needs restart (future enhancement)
  if (['openaiApiKey', 'openrouterApiKey', 'ollamaBaseUrl'].includes(key)) {
    // TODO: Restart backend with new env vars
  }
  
  return true;
});

ipcMain.handle('open-main-window', async () => {
  console.log('[Main] open-main-window IPC called');
  try {
    createMainWindow();
    console.log('[Main] Main window created successfully');
    return true;
  } catch (error) {
    console.error('[Main] Failed to create main window:', error);
    throw error;
  }
});

app.whenReady().then(async () => {
  // Hide app from dock (menu bar app like Raycast)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  try {
    await startBackend();
  } catch (error) {
    console.error('[Main] Failed to start backend, app will continue but may not function:', error);
  }
  
  createOverlayWindow();
  
  // Register global shortcut
  const shortcut = 'CmdOrCtrl+Shift+Space';
  const registered = globalShortcut.register(shortcut, () => {
    toggleOverlay();
  });
  
  if (!registered) {
    console.warn(`[Main] Failed to register shortcut: ${shortcut}`);
  }
});

app.on('will-quit', async () => {
  globalShortcut.unregisterAll();
  
  if (backendServer) {
    await new Promise<void>((resolve) => {
      if (backendServer && 'close' in backendServer) {
        backendServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
});

app.on('window-all-closed', (event: Electron.Event) => {
  // Prevent app from closing when all windows are closed (we want it to run in background)
  event.preventDefault();
});

// Handle app activation (macOS)
app.on('activate', () => {
  if (overlayWindow === null) {
    createOverlayWindow();
  } else {
    toggleOverlay();
  }
});

