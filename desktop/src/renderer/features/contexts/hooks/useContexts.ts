import { useState, useCallback, useEffect } from 'react';
import { contextsRepository } from '../data/contextsRepository';
import { Context } from '../domain/Context';
import type { CreateContextRequest, UpdateContextRequest } from '../../../services/contextsService';

interface UseContextsOptions {
  hierarchy?: boolean;
  autoLoad?: boolean;
}

/**
 * Hook for managing contexts
 */
export function useContexts(options: UseContextsOptions = {}) {
  const { hierarchy = false, autoLoad = true } = options;

  const [contexts, setContexts] = useState<Context[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContexts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await contextsRepository.list({ hierarchy });
      setContexts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load contexts');
    } finally {
      setIsLoading(false);
    }
  }, [hierarchy]);

  const createContext = useCallback(async (request: CreateContextRequest): Promise<Context | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const created = await contextsRepository.create(request);
      await loadContexts(); // Reload to get updated hierarchy
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create context');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadContexts]);

  const updateContext = useCallback(async (request: UpdateContextRequest): Promise<Context | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await contextsRepository.update(request);
      await loadContexts(); // Reload to get updated hierarchy
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update context');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadContexts]);

  const deleteContext = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await contextsRepository.delete(id);
      await loadContexts(); // Reload to get updated hierarchy
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete context');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadContexts]);

  useEffect(() => {
    if (autoLoad) {
      loadContexts();
    }
  }, [autoLoad, loadContexts]);

  return {
    contexts,
    isLoading,
    error,
    loadContexts,
    createContext,
    updateContext,
    deleteContext,
    clearError: () => setError(null),
  };
}
