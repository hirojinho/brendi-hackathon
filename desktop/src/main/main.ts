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
  console.log('[Main] Starting backend initialization...');
  console.log('[Main] User data path:', userDataPath);
  
  // Override cwd so backend databases are created in userData
  const originalCwd = process.cwd();
  process.chdir(userDataPath);
  
  try {
    // Get available port
    console.log('[Main] Getting available port...');
    const port = await getPort({ port: 3001 });
    console.log('[Main] Using port:', port);
    
    // Load environment variables from store
    const envVars: Record<string, string> = {};
    const openaiKey = configStore.get('openaiApiKey') as string | undefined;
    const openrouterKey = configStore.get('openrouterApiKey') as string | undefined;
    const ollamaUrl = configStore.get('ollamaBaseUrl') as string | undefined;
    const maxQuickNotes = configStore.get('maxQuickNotes') as number | undefined;
    const reviewAgeThresholdHours = configStore.get('reviewAgeThresholdHours') as number | undefined;
    
    if (openaiKey) envVars.OPENAI_API_KEY = openaiKey;
    if (openrouterKey) envVars.OPENROUTER_API_KEY = openrouterKey;
    if (ollamaUrl) envVars.OLLAMA_BASE_URL = ollamaUrl;
    if (maxQuickNotes) envVars.MAX_QUICK_NOTES = maxQuickNotes.toString();
    if (reviewAgeThresholdHours) envVars.REVIEW_AGE_THRESHOLD_HOURS = reviewAgeThresholdHours.toString();
    
    console.log('[Main] Environment variables configured');
    
    // Initialize backend
    console.log('[Main] Initializing backend...');
    const result = await initializeBackend(port, envVars);
    backendUrl = `http://127.0.0.1:${port}`;
    backendServer = result.app;
    
    console.log('[Main] Backend started successfully on:', backendUrl);
    
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

// Enhanced error handling helper
function handleIpcError(error: any, operation: string): Error {
  console.error(`[Main] ${operation} error:`, error);
  
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
    return new Error('Unable to connect to backend service. Please restart the application.');
  }
  
  // API errors with structured response
  if (error.message.includes('HTTP 4')) {
    return new Error(`Invalid request: ${error.message}`);
  }
  
  if (error.message.includes('HTTP 5')) {
    return new Error('Server error occurred. Please try again.');
  }
  
  // Rate limiting
  if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
    return new Error('Rate limit exceeded. Please wait before trying again.');
  }
  
  // Review-specific errors
  if (error.message.includes('review') && error.message.includes('required')) {
    return new Error('Review is required before creating new notes.');
  }
  
  if (error.message.includes('limit') && error.message.includes('reached')) {
    return new Error('Note limit reached. Please review existing notes first.');
  }
  
  // Default error
  return error instanceof Error ? error : new Error(String(error));
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
    throw handleIpcError(error, 'Chat');
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
    throw handleIpcError(error, 'Note creation');
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

ipcMain.handle('quick-notes:status', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/quick-notes/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Quick notes status error:', error);
    throw error;
  }
});

// Permanent Notes IPC Handlers
ipcMain.handle('permanent-notes:list', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/permanent-notes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Permanent notes list error:', error);
    throw error;
  }
});

ipcMain.handle('permanent-notes:search', async (_event, query: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const url = new URL(`${backendUrl}/api/permanent-notes/search`);
    url.searchParams.set('q', query);
    
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
    console.error('[Main] Permanent notes search error:', error);
    throw error;
  }
});

ipcMain.handle('permanent-notes:get', async (_event, id: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/permanent-notes/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Permanent note get error:', error);
    throw error;
  }
});

ipcMain.handle('permanent-notes:create', async (_event, payload: { title: string; content: string; tags?: string[]; sourceQuickNoteId?: string }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/permanent-notes`, {
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
    console.error('[Main] Permanent note create error:', error);
    throw error;
  }
});

ipcMain.handle('permanent-notes:update', async (_event, payload: { id: string; title?: string; content?: string; tags?: string[] }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/permanent-notes/${payload.id}`, {
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
    console.error('[Main] Permanent note update error:', error);
    throw error;
  }
});

ipcMain.handle('permanent-notes:delete', async (_event, id: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/permanent-notes/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Permanent note delete error:', error);
    throw error;
  }
});

// Review IPC Handlers
ipcMain.handle('review:status', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/review/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Review status error:', error);
    throw error;
  }
});

ipcMain.handle('review:create-session', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/review/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Review create session error:', error);
    throw error;
  }
});

ipcMain.handle('review:get-active-session', async () => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/review/session/active`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Review get active session error:', error);
    throw error;
  }
});

ipcMain.handle('review:process-note', async (_event, payload: { sessionId: string; noteId: string; action: 'transform' | 'discard'; permanentNoteData?: any }) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/review/session/${payload.sessionId}/notes/${payload.noteId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: payload.action,
        permanentNoteData: payload.permanentNoteData
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Review process note error:', error);
    throw error;
  }
});

ipcMain.handle('review:complete-session', async (_event, sessionId: string) => {
  if (!backendUrl) {
    throw new Error('Backend not initialized');
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/review/session/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('[Main] Review complete session error:', error);
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
  console.log('[Main] Health check requested, backendUrl:', backendUrl);
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

ipcMain.handle('config:set', async (_event, key: string, value: any) => {
  configStore.set(key, value);
  
  // If API keys or quick notes settings changed, backend needs restart
  if (['openaiApiKey', 'openrouterApiKey', 'ollamaBaseUrl', 'maxQuickNotes', 'reviewAgeThresholdHours'].includes(key)) {
    try {
      // Close existing backend
      if (backendServer && 'close' in backendServer) {
        await new Promise<void>((resolve) => {
          backendServer.close(() => resolve());
        });
      }
      
      // Restart backend with new settings
      await startBackend();
    } catch (error) {
      console.error('[Main] Failed to restart backend with new settings:', error);
    }
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

