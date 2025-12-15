import { useState, useCallback, useEffect } from 'react';
import { notesRepository } from '../data/notesRepository';
import { QuickNote } from '../domain/QuickNote';
import type { UpdateQuickNoteRequest, QuickNotesStatus } from '../../../services/quickNotesService';

/**
 * Hook for managing quick notes
 */
export function useQuickNotes(options: { 
  autoLoad?: boolean;
  contextId?: string;
} = {}) {
  const { autoLoad = false, contextId } = options;

  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notesRepository.listQuickNotes(contextId);
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quick notes');
    } finally {
      setIsLoading(false);
    }
  }, [contextId]);

  const updateNote = useCallback(async (request: UpdateQuickNoteRequest): Promise<QuickNote | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await notesRepository.updateQuickNote(request);
      
      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === updated.id ? updated : note
      ));
      
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update quick note');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await notesRepository.deleteQuickNote(id);
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== id));
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete quick note');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadNotes();
    }
  }, [autoLoad, loadNotes]);

  return {
    notes,
    isLoading,
    error,
    loadNotes,
    updateNote,
    deleteNote,
    clearError: () => setError(null),
  };
}

/**
 * Hook for quick notes status
 */
export function useQuickNotesStatus(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = false } = options;

  const [status, setStatus] = useState<QuickNotesStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notesRepository.getQuickNotesStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quick notes status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadStatus();
    }
  }, [autoLoad, loadStatus]);

  return {
    status,
    isLoading,
    error,
    loadStatus,
    clearError: () => setError(null),
  };
}
