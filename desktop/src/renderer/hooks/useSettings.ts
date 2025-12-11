import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import type { Settings, ProviderType } from '../types';

export function useSettings(isOpen: boolean) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [provider, setProvider] = useState<ProviderType>('openai');
  const [modelName, setModelName] = useState('');
  const [globalShortcut, setGlobalShortcut] = useState('');
  const [defaultMode, setDefaultMode] = useState<'chat' | 'note-taking'>('chat');
  const [maxQuickNotes, setMaxQuickNotes] = useState(10);
  const [reviewAgeThresholdHours, setReviewAgeThresholdHours] = useState(24);
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
      setGlobalShortcut(settings.globalShortcut || 'CmdOrCtrl+Shift+Space');
      setDefaultMode(settings.defaultMode || 'chat');
      setMaxQuickNotes(settings.maxQuickNotes || 10);
      setReviewAgeThresholdHours(settings.reviewAgeThresholdHours || 24);
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
        globalShortcut: globalShortcut,
        defaultMode: defaultMode,
        maxQuickNotes: maxQuickNotes,
        reviewAgeThresholdHours: reviewAgeThresholdHours,
      };

      await settingsService.saveAllSettings(settings);
      
      setSaveStatus('Settings saved! Shortcut takes effect immediately. Restart the app for API keys to take effect.');
      setTimeout(() => {
        setSaveStatus('');
      }, 4000);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setSaveStatus(`Error: ${error.message || 'Failed to save settings'}`);
    } finally {
      setIsLoading(false);
    }
  }, [openaiKey, openrouterKey, ollamaUrl, provider, modelName, globalShortcut, defaultMode, maxQuickNotes, reviewAgeThresholdHours]);

  return {
    // State
    openaiKey,
    openrouterKey,
    ollamaUrl,
    provider,
    modelName,
    globalShortcut,
    defaultMode,
    maxQuickNotes,
    reviewAgeThresholdHours,
    isLoading,
    saveStatus,
    // Setters
    setOpenaiKey,
    setOpenrouterKey,
    setOllamaUrl,
    setProvider,
    setModelName,
    setGlobalShortcut,
    setDefaultMode,
    setMaxQuickNotes,
    setReviewAgeThresholdHours,
    // Actions
    loadSettings,
    saveSettings,
  };
}

