import type { Settings } from '../types';

export class SettingsService {
  async loadSetting(key: keyof Settings): Promise<string> {
    try {
      const value = await window.electronAPI.getConfig(key);
      return value || '';
    } catch (error) {
      console.error(`Failed to load setting ${key}:`, error);
      return '';
    }
  }

  async loadAllSettings(): Promise<Settings> {
    try {
      const [openaiApiKey, openrouterApiKey, ollamaBaseUrl, provider, modelName, globalShortcut, defaultMode, maxQuickNotes, reviewAgeThresholdHours] = await Promise.all([
        this.loadSetting('openaiApiKey'),
        this.loadSetting('openrouterApiKey'),
        this.loadSetting('ollamaBaseUrl'),
        this.loadSetting('provider'),
        this.loadSetting('modelName'),
        window.electronAPI.getShortcut(),
        this.loadSetting('defaultMode'),
        this.loadSetting('maxQuickNotes'),
        this.loadSetting('reviewAgeThresholdHours'),
      ]);

      return {
        openaiApiKey,
        openrouterApiKey,
        ollamaBaseUrl,
        provider: provider as any || undefined,
        modelName: modelName || undefined,
        globalShortcut: globalShortcut || undefined,
        defaultMode: (defaultMode as 'chat' | 'note-taking') || undefined,
        maxQuickNotes: maxQuickNotes ? parseInt(maxQuickNotes, 10) : undefined,
        reviewAgeThresholdHours: reviewAgeThresholdHours ? parseInt(reviewAgeThresholdHours, 10) : undefined,
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  async saveSetting(key: keyof Settings, value: string): Promise<void> {
    try {
      await window.electronAPI.setConfig(key, value || '');
    } catch (error: any) {
      throw new Error(`Failed to save ${key}: ${error.message || 'Unknown error'}`);
    }
  }

  async saveAllSettings(settings: Settings): Promise<void> {
    try {
      await Promise.all([
        this.saveSetting('openaiApiKey', settings.openaiApiKey || ''),
        this.saveSetting('openrouterApiKey', settings.openrouterApiKey || ''),
        this.saveSetting('ollamaBaseUrl', settings.ollamaBaseUrl || ''),
        this.saveSetting('provider', settings.provider || ''),
        this.saveSetting('modelName', settings.modelName || ''),
        this.saveSetting('defaultMode', settings.defaultMode || ''),
        this.saveSetting('maxQuickNotes', settings.maxQuickNotes?.toString() || '10'),
        this.saveSetting('reviewAgeThresholdHours', settings.reviewAgeThresholdHours?.toString() || '24'),
      ]);
      
      // Save shortcut separately as it has special handling
      if (settings.globalShortcut) {
        const result = await window.electronAPI.setShortcut(settings.globalShortcut);
        if (!result.success) {
          throw new Error(result.error || 'Failed to set shortcut');
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to save settings: ${error.message || 'Unknown error'}`);
    }
  }
}

export const settingsService = new SettingsService();

