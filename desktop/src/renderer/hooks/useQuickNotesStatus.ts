/**
 * @deprecated Use useQuickNotesStatus from features/notes instead
 * This hook is maintained for backward compatibility only.
 * See MIGRATION_GUIDE.md for migration instructions.
 */
import { useState, useEffect, useCallback } from 'react';
import { quickNotesService, type QuickNotesStatus } from '../services/quickNotesService';

export function useQuickNotesStatus() {
  const [status, setStatus] = useState<QuickNotesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusData = await quickNotesService.getStatus();
      setStatus(statusData);
    } catch (err: any) {
      console.error('Failed to load quick notes status:', err);
      setError(err.message || 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return {
    status,
    isLoading,
    error,
    reload: loadStatus
  };
}