import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openMainWindow: async (): Promise<boolean> => {
    const result = await ipcRenderer.invoke('open-main-window');
    return !!result;
  }
});

export {};


