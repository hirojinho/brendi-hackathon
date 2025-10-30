import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import getPort from 'get-port';
import Store from 'electron-store';
import { initializeBackend } from './backend.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let overlayWindow: BrowserWindow | null = null;
let backendUrl: string | null = null;
let backendServer: any = null;
const configStore = new Store();

// Ensure userData directory exists
const userDataPath = app.getPath('userData');
app.setPath('userData', userDataPath);

async function startBackend() {
  console.log('[Main] Starting backend initialization...');
  const userDataPath = app.getPath('userData');
  
  // Override cwd so backend databases are created in userData
  const originalCwd = process.cwd();
  console.log('[Main] Setting cwd to:', userDataPath);
  process.chdir(userDataPath);
  
  try {
    // Get available port
    const port = await getPort({ port: 3001 });
    console.log('[Main] Got port:', port);
    
    // Load environment variables from store
    const envVars: Record<string, string> = {};
    const openaiKey = configStore.get('openaiApiKey') as string | undefined;
    const openrouterKey = configStore.get('openrouterApiKey') as string | undefined;
    const ollamaUrl = configStore.get('ollamaBaseUrl') as string | undefined;
    
    if (openaiKey) {
      envVars.OPENAI_API_KEY = openaiKey;
      console.log('[Main] OpenAI key found');
    }
    if (openrouterKey) {
      envVars.OPENROUTER_API_KEY = openrouterKey;
      console.log('[Main] OpenRouter key found');
    }
    if (ollamaUrl) {
      envVars.OLLAMA_BASE_URL = ollamaUrl;
      console.log('[Main] Ollama URL found:', ollamaUrl);
    }
    
    console.log('[Main] Calling initializeBackend...');
    // Initialize backend
    const result = await initializeBackend(port, envVars);
    backendUrl = `http://127.0.0.1:${port}`;
    backendServer = result.app;
    
    console.log(`[Main] ✓ Backend initialized successfully at ${backendUrl}`);
    console.log(`[Main] User data path: ${userDataPath}`);
  } catch (error) {
    console.error('[Main] ✗ Failed to start backend:', error);
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
  console.log('[Main] Preload script path:', preloadPath);
  console.log('[Main] Preload script exists?', fs.existsSync(preloadPath));
  
  overlayWindow = new BrowserWindow({
    width: 700,
    height: 520,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Preload scripts need sandbox: false to use contextBridge
    },
    backgroundColor: '#00000000',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
  });

  // Load renderer
  const loadUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  console.log('[Main] Loading renderer from:', loadUrl);
  
  overlayWindow.loadURL(loadUrl);
  
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Renderer finished loading');
    // Verify preload executed
    if (overlayWindow) {
      overlayWindow.webContents.executeJavaScript(`
        console.log('window.electronAPI exists?', typeof window.electronAPI !== 'undefined');
        console.log('window.electronAPI:', window.electronAPI);
      `).catch(err => console.error('[Main] Failed to check electronAPI:', err));
    }
  });
  
  overlayWindow.webContents.on('console-message', (_event, level, message, _line, sourceId) => {
    const prefix = sourceId === 'electron/preload' || String(sourceId).includes('preload') ? '[Preload]' : '[Renderer]';
    console.log(`${prefix} [${level}]:`, message);
  });
  
  // Check for preload errors
  overlayWindow.webContents.on('preload-error', (_event, _preloadPath, error) => {
    console.error('[Main] Preload script error:', error);
  });

  // Hide on blur (optional - can be removed if you want it to stay visible)
  overlayWindow.on('blur', () => {
    // Optionally hide on blur
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
      overlayWindow.center();
      overlayWindow.show();
      overlayWindow.focus();
    }
  }
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
  console.log('[Main] ===== Health check IPC called =====');
  console.log('[Main] backendUrl value:', backendUrl);
  console.log('[Main] backendServer value:', backendServer ? 'exists' : 'null');
  
  if (!backendUrl) {
    console.log('[Main] Returning unhealthy - backendUrl is null');
    return { healthy: false, error: 'Backend not initialized' };
  }
  
  // If backendUrl is set, the backend should be running
  // (we set it only after successful initialization)
  console.log('[Main] Returning healthy:', backendUrl);
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

app.whenReady().then(async () => {
  try {
    await startBackend();
  } catch (error) {
    console.error('[Main] Failed to start backend, app will continue but may not function:', error);
  }
  
  // Create window after backend is ready (or attempted)
  console.log('[Main] Creating overlay window...');
  createOverlayWindow();
  
  // Give window time to load, then verify backendUrl is still set
  setTimeout(() => {
    console.log('[Main] Backend URL after window creation:', backendUrl);
    if (backendUrl) {
      console.log('[Main] Backend should be accessible at:', backendUrl);
    } else {
      console.error('[Main] ERROR: backendUrl is null after initialization!');
    }
  }, 2000);
  
  // Register global shortcut (Option+Space on Mac)
  const shortcut = 'Shift+Space+Q';
  const registered = globalShortcut.register(shortcut, () => {
    toggleOverlay();
  });
  
  if (!registered) {
    console.warn(`[Main] Failed to register shortcut: ${shortcut}`);
  } else {
    console.log(`[Main] Registered global shortcut: ${shortcut}`);
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

