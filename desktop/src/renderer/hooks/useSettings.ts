import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import type { Settings, ProviderType } from '../types';

export function useSettings(isOpen: boolean) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [provider, setProvider] = useState<ProviderType>('openai');
  const [modelName, setModelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await settingsService.loadAllSettings();
      setOpenaiKey(settings.openaiApiKey || '');
      setOpenrouterKey(settings.openrouterApiKey || '');
      setOllamaUrl(settings.ollamaBaseUrl || '');
      setProvider(settings.provider || 'openai');
      setModelName(settings.modelName || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    setSaveStatus('');

    try {
      const settings: Settings = {
        openaiApiKey: openaiKey,
        openrouterApiKey: openrouterKey,
        ollamaBaseUrl: ollamaUrl,
        provider: provider,
        modelName: modelName,
      };

      await settingsService.saveAllSettings(settings);
      
      setSaveStatus('Settings saved! Restart the app for API keys to take effect.');
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setSaveStatus(`Error: ${error.message || 'Failed to save settings'}`);
    } finally {
      setIsLoading(false);
    }
  }, [openaiKey, openrouterKey, ollamaUrl, provider, modelName]);

  return {
    // State
    openaiKey,
    openrouterKey,
    ollamaUrl,
    provider,
    modelName,
    isLoading,
    saveStatus,
    // Setters
    setOpenaiKey,
    setOpenrouterKey,
    setOllamaUrl,
    setProvider,
    setModelName,
    // Actions
    loadSettings,
    saveSettings,
  };
}

