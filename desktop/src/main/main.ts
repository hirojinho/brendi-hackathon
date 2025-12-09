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
  globalShortcut?: string;
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
let currentShortcut: string | null = null;
const configStore = new Store<ConfigStore>() as unknown as StoreInterface;

// Function to register global shortcut
function registerGlobalShortcut(shortcut: string): boolean {
  // Unregister existing shortcut if any
  if (currentShortcut) {
    globalShortcut.unregister(currentShortcut);
  }
  
  // Register new shortcut
  const registered = globalShortcut.register(shortcut, () => {
    toggleOverlay();
  });
  
  if (registered) {
    currentShortcut = shortcut;
    console.log(`[Main] Registered global shortcut: ${shortcut}`);
  } else {
    console.warn(`[Main] Failed to register shortcut: ${shortcut}`);
  }
  
  return registered;
}

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
  if (overlayWindow && overlayWindow.isVisible()) {
    overlayWindow.hide();
  } else {
    // On macOS, destroy and recreate the window each time to ensure it appears on the current workspace
    // This prevents the window from being "bound" to the workspace where it was first created
    if (overlayWindow) {
      overlayWindow.destroy();
      overlayWindow = null;
    }
    
    // Create fresh window - this ensures it's created in the current workspace
    createOverlayWindow();
    
    // On macOS, explicitly ensure window is not visible on all workspaces
    // and is created in the current workspace
    if (!overlayWindow) {
      return; // Safety check
    }
    
    const currentWindow: BrowserWindow = overlayWindow;
    if (process.platform === 'darwin') {
      currentWindow.setVisibleOnAllWorkspaces(false);
      // Small delay to ensure workspace assignment happens correctly
      // Capture window reference to avoid TypeScript issues in setTimeout
      const windowRef = currentWindow;
      setTimeout(() => {
        if (windowRef && !windowRef.isDestroyed()) {
          windowRef.center();
          windowRef.show();
          windowRef.focus();
          windowRef.moveTop();
        }
      }, 10);
    } else {
      currentWindow.center();
      currentWindow.show();
      currentWindow.focus();
      currentWindow.moveTop();
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

ipcMain.handle('note-taking-agent:process', async (_event, payload) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/note-taking-agent`, {
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
    console.error('[Main] Note-taking agent error:', error);
    throw error;
  }
});

ipcMain.handle('quick-notes:list', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/quick-notes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Quick notes list error:', error);
    throw error;
  }
});

ipcMain.handle('quick-notes:get', async (_event, id: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/quick-notes/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Quick note get error:', error);
    throw error;
  }
});

ipcMain.handle('quick-notes:update', async (_event, payload: { id: string; title?: string; content?: string; tags?: string[] }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/quick-notes/${payload.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Quick note update error:', error);
    throw error;
  }
});

ipcMain.handle('quick-notes:delete', async (_event, id: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/quick-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Quick note delete error:', error);
    throw error;
  }
});

ipcMain.handle('contexts:list', async (_event, options?: { hierarchy?: boolean }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const url = new URL(`${backendUrl}/api/contexts`);
    if (options?.hierarchy) {
      url.searchParams.set('hierarchy', 'true');
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Contexts list error:', error);
    throw error;
  }
});

ipcMain.handle('contexts:create', async (_event, payload: { name: string; description?: string; parentId?: string | null }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/contexts`, {
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
    console.error('[Main] Context create error:', error);
    throw error;
  }
});

ipcMain.handle('contexts:update', async (_event, payload: { id: string; name?: string; description?: string; parentId?: string | null }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/contexts/${payload.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Context update error:', error);
    throw error;
  }
});

ipcMain.handle('contexts:getChildren', async (_event, parentId: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/contexts/${parentId}/children`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Context get children error:', error);
    throw error;
  }
});

ipcMain.handle('contexts:delete', async (_event, id: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/contexts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Context delete error:', error);
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
  
  // If shortcut changed, re-register it
  if (key === 'globalShortcut' && value) {
    registerGlobalShortcut(value);
  }
  
  return true;
});

ipcMain.handle('shortcut:get', () => {
  return configStore.get('globalShortcut') || 'CmdOrCtrl+Shift+Space';
});

ipcMain.handle('shortcut:set', (_event, shortcut: string) => {
  if (!shortcut || shortcut.trim() === '') {
    return { success: false, error: 'Shortcut cannot be empty' };
  }
  
  // Validate shortcut format (basic validation)
  const validPattern = /^(CommandOrControl|CmdOrCtrl|Command|Control|Cmd|Ctrl|Alt|Option|Shift|Super|Meta)(\+[A-Za-z0-9]+)+$/;
  if (!validPattern.test(shortcut)) {
    return { success: false, error: 'Invalid shortcut format. Use format like: CmdOrCtrl+Shift+Space' };
  }
  
  const registered = registerGlobalShortcut(shortcut);
  if (registered) {
    configStore.set('globalShortcut', shortcut);
    return { success: true };
  } else {
    return { success: false, error: 'Failed to register shortcut. It may be in use by another application.' };
  }
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
  
  // Register global shortcut from config or use default
  const shortcut = (configStore.get('globalShortcut') as string | undefined) || 'CmdOrCtrl+Shift+Space';
  registerGlobalShortcut(shortcut);
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

