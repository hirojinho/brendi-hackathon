import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
contextBridge.exposeInMainWorld('electronAPI', {
  // Chat API
  sendChat: (payload: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    model?: 'openai' | 'openrouter' | 'ollama';
    modelName?: string;
    useRag?: boolean;
    maxChunks?: number;
  }) => ipcRenderer.invoke('chat:send', payload),
  
  // Note API
  createNote: (payload: {
    content: string;
    model?: 'openai' | 'openrouter' | 'ollama';
    modelName?: string;
  }) => ipcRenderer.invoke('note:create', payload),
  
  // Overlay controls
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  
  // Server health
  checkHealth: () => ipcRenderer.invoke('server:health'),
  
  // Config
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  
  // Main window
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
});

// Also expose as window.api for overlay compatibility
contextBridge.exposeInMainWorld('api', {
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
});
} catch (error) {
  console.error('[Preload] Failed to expose electronAPI:', error);
}

// TypeScript definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      sendChat: (payload: {
        message: string;
        history?: Array<{ role: string; content: string }>;
        model?: 'openai' | 'openrouter' | 'ollama';
        modelName?: string;
        useRag?: boolean;
        maxChunks?: number;
      }) => Promise<{ response: string; retrievedChunks?: any[] }>;
      createNote: (payload: {
        content: string;
        model?: 'openai' | 'openrouter' | 'ollama';
        modelName?: string;
      }) => Promise<{ notes: any[] }>;
      toggleOverlay: () => Promise<void>;
      checkHealth: () => Promise<{ healthy: boolean; url?: string; error?: string }>;
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<boolean>;
      openMainWindow: () => Promise<boolean>;
    };
  }
}

