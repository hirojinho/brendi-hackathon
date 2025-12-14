import { useState, useCallback, useEffect } from 'react';
import type { ModelType } from '../types';
import { noteTakingAgentService } from '../services/noteTakingAgentService';
import { settingsService } from '../services/settingsService';

interface UseNoteTakingOptions {
  initialModel?: ModelType;
  initialModelName?: string;
  selectedContextId?: string | null;
}

export function useNoteTaking(options: UseNoteTakingOptions = {}) {
  const {
    initialModel,
    initialModelName = '',
    selectedContextId = null,
  } = options;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelType>(initialModel || 'openrouter');
  const [modelName, setModelName] = useState<string>(initialModelName);
  const [lastResult, setLastResult] = useState<{
    shouldCreateNote: boolean;
    contextId?: string | null;
    suggestedContext?: { name: string; description?: string; parentId?: string | null } | null;
    reasoning: string;
    notes: any[];
    createdNoteIds?: string[];
  } | null>(null);

  // Load saved provider and model from settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const settings = await settingsService.loadAllSettings();
        if (settings.provider) {
          setModel(settings.provider);
        }
        if (settings.modelName) {
          setModelName(settings.modelName);
        }
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    };
    loadSavedSettings();
  }, []);

  const processInput = useCallback(async (inputText?: string) => {
    const text = inputText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await noteTakingAgentService.processInput({
        input: text,
        model,
        modelName: modelName || undefined,
        currentContextId: selectedContextId || undefined,
      });

      setLastResult(result);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process input';
      setLastResult({
        shouldCreateNote: false,
        contextId: null,
        suggestedContext: null,
        reasoning: `Error: ${errorMessage}`,
        notes: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, model, modelName, isLoading, selectedContextId]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setInput('');
  }, []);

  return {
    // State
    input,
    isLoading,
    model,
    modelName,
    lastResult,
    // Setters
    setInput,
    setModel,
    setModelName,
    // Actions
    processInput,
    clearResult,
  };
}

