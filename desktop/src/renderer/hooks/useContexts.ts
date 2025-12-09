import { useState, useEffect, useCallback } from 'react';
import { contextsService, type Context } from '../services/contextsService';

interface UseContextsOptions {
  hierarchy?: boolean;
  autoLoad?: boolean;
}

export function useContexts(options: UseContextsOptions = {}) {
  const { hierarchy = false, autoLoad = true } = options;
  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadContexts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedContexts = await contextsService.list({ hierarchy });
      setContexts(loadedContexts);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load contexts');
      setError(error);
      console.error('Failed to load contexts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hierarchy]);

  useEffect(() => {
    if (autoLoad) {
      loadContexts();
    }
  }, [autoLoad, loadContexts]);

  const createContext = useCallback(async (request: {
    name: string;
    description?: string;
    parentId?: string | null;
  }) => {
    try {
      const newContext = await contextsService.create(request);
      await loadContexts();
      return newContext;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create context');
      setError(error);
      throw error;
    }
  }, [loadContexts]);

  const updateContext = useCallback(async (request: {
    id: string;
    name?: string;
    description?: string;
    parentId?: string | null;
  }) => {
    try {
      const updatedContext = await contextsService.update(request);
      await loadContexts();
      return updatedContext;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update context');
      setError(error);
      throw error;
    }
  }, [loadContexts]);

  const deleteContext = useCallback(async (id: string) => {
    try {
      await contextsService.delete(id);
      await loadContexts();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete context');
      setError(error);
      throw error;
    }
  }, [loadContexts]);

  return {
    contexts,
    isLoading,
    error,
    loadContexts,
    createContext,
    updateContext,
    deleteContext,
  };
}

