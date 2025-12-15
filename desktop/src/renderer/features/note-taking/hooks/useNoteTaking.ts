import { useState, useCallback, useEffect } from 'react';
import { noteTakingRepository } from '../data/noteTakingRepository';
import { NoteTakingResult } from '../domain/NoteTakingResult';
import type { ModelType } from '../../../types/chat';
import { settingsService } from '../../../services/settingsService';

interface UseNoteTakingOptions {
  initialModel?: ModelType;
  initialModelName?: string;
  selectedContextId?: string | null;
}

/**
 * Hook for note-taking agent
 */
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
  const [result, setResult] = useState<NoteTakingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.loadAllSettings();
        if (settings.provider) {
          setModel(settings.provider);
        }
        if (settings.modelName) {
          setModelName(settings.modelName);
        }
      } catch (err) {
        console.error('Failed to load note-taking settings:', err);
      }
    };
    loadSettings();
  }, []);

  const processInput = useCallback(async (inputText?: string) => {
    const text = inputText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const noteTakingResult = await noteTakingRepository.processInput(
        text,
        model,
        modelName || undefined,
        selectedContextId || undefined
      );
      setResult(noteTakingResult);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process input';
      setError(errorMessage);
      setResult(
        NoteTakingResult.fromData({
          shouldCreateNote: false,
          contextId: null,
          suggestedContext: null,
          reasoning: `Error: ${errorMessage}`,
          notes: [],
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, model, modelName, isLoading, selectedContextId]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    input,
    setInput,
    isLoading,
    error,
    result,
    model,
    modelName,
    setModel,
    setModelName,
    processInput,
    clearResult,
    clearError: () => setError(null),
  };
}
