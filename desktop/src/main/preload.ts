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
  
  // Note-taking Agent API
  processNoteTakingInput: (payload: {
    input: string;
    model?: 'openai' | 'openrouter' | 'ollama';
    modelName?: string;
  }) => ipcRenderer.invoke('note-taking-agent:process', payload),
  
  // Quick Notes API
  listQuickNotes: () => ipcRenderer.invoke('quick-notes:list'),
  getQuickNote: (id: string) => ipcRenderer.invoke('quick-notes:get', id),
  updateQuickNote: (payload: { id: string; title?: string; content?: string; tags?: string[]; contextId?: string | null }) => ipcRenderer.invoke('quick-notes:update', payload),
  deleteQuickNote: (id: string) => ipcRenderer.invoke('quick-notes:delete', id),
  getQuickNotesStatus: () => ipcRenderer.invoke('quick-notes:status'),
  
  // Permanent Notes API
  listPermanentNotes: () => ipcRenderer.invoke('permanent-notes:list'),
  searchPermanentNotes: (query: string) => ipcRenderer.invoke('permanent-notes:search', query),
  getPermanentNote: (id: string) => ipcRenderer.invoke('permanent-notes:get', id),
  createPermanentNote: (payload: { title: string; content: string; tags?: string[]; sourceQuickNoteId?: string }) => ipcRenderer.invoke('permanent-notes:create', payload),
  updatePermanentNote: (payload: { id: string; title?: string; content?: string; tags?: string[] }) => ipcRenderer.invoke('permanent-notes:update', payload),
  deletePermanentNote: (id: string) => ipcRenderer.invoke('permanent-notes:delete', id),
  
  // Contexts API
  listContexts: (options?: { hierarchy?: boolean }) => ipcRenderer.invoke('contexts:list', options),
  createContext: (payload: { name: string; description?: string; parentId?: string | null }) => ipcRenderer.invoke('contexts:create', payload),
  updateContext: (payload: { id: string; name?: string; description?: string; parentId?: string | null }) => ipcRenderer.invoke('contexts:update', payload),
  getContextChildren: (parentId: string) => ipcRenderer.invoke('contexts:getChildren', parentId),
  deleteContext: (id: string) => ipcRenderer.invoke('contexts:delete', id),
  
  // Overlay controls
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  
  // Server health
  checkHealth: () => ipcRenderer.invoke('server:health'),
  
  // Config
  getConfig: (key: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  
  // Shortcut
  getShortcut: () => ipcRenderer.invoke('shortcut:get'),
  setShortcut: (shortcut: string) => ipcRenderer.invoke('shortcut:set', shortcut),
  
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
      processNoteTakingInput: (payload: {
        input: string;
        model?: 'openai' | 'openrouter' | 'ollama';
        modelName?: string;
      }) => Promise<{ shouldCreateNote: boolean; reasoning: string; notes: any[] }>;
      listQuickNotes: () => Promise<{ notes: Array<{ id: string; title: string; content: string; tags: string[]; createdAt: string; lastModified: string }> }>;
      getQuickNote: (id: string) => Promise<{ note: { id: string; title: string; content: string; tags: string[]; createdAt: string; lastModified: string } }>;
      updateQuickNote: (payload: { id: string; title?: string; content?: string; tags?: string[]; contextId?: string | null }) => Promise<{ note: { id: string; title: string; content: string; tags: string[]; contextId: string | null; createdAt: string; lastModified: string } }>;
      deleteQuickNote: (id: string) => Promise<{ message: string }>;
      getQuickNotesStatus: () => Promise<{ status: { currentCount: number; maxQuickNotes: number; canCreateNew: boolean; isReviewRequired: boolean; notesRequiringReviewCount: number; isAtLimit: boolean; remainingSlots: number } }>;
      listPermanentNotes: () => Promise<{ notes: Array<{ id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; sourceQuickNoteId?: string }> }>;
      searchPermanentNotes: (query: string) => Promise<{ notes: Array<{ id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; sourceQuickNoteId?: string }>; query: string; count: number }>;
      getPermanentNote: (id: string) => Promise<{ note: { id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; sourceQuickNoteId?: string } }>;
      createPermanentNote: (payload: { title: string; content: string; tags?: string[]; sourceQuickNoteId?: string }) => Promise<{ note: { id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; sourceQuickNoteId?: string } }>;
      updatePermanentNote: (payload: { id: string; title?: string; content?: string; tags?: string[] }) => Promise<{ note: { id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; sourceQuickNoteId?: string } }>;
      deletePermanentNote: (id: string) => Promise<{ message: string }>;
      listContexts: (options?: { hierarchy?: boolean }) => Promise<{ contexts: Array<{ id: string; name: string; description: string; parentId: string | null; createdAt: string; lastModified: string; children?: any[] }> }>;
      createContext: (payload: { name: string; description?: string; parentId?: string | null }) => Promise<{ context: { id: string; name: string; description: string; parentId: string | null; createdAt: string; lastModified: string } }>;
      updateContext: (payload: { id: string; name?: string; description?: string; parentId?: string | null }) => Promise<{ context: { id: string; name: string; description: string; parentId: string | null; createdAt: string; lastModified: string } }>;
      getContextChildren: (parentId: string) => Promise<{ contexts: Array<{ id: string; name: string; description: string; parentId: string | null; createdAt: string; lastModified: string }> }>;
      deleteContext: (id: string) => Promise<{ message: string }>;
      toggleOverlay: () => Promise<void>;
      checkHealth: () => Promise<{ healthy: boolean; url?: string; error?: string }>;
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<boolean>;
      getShortcut: () => Promise<string>;
      setShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>;
      openMainWindow: () => Promise<boolean>;
    };
  }
}

