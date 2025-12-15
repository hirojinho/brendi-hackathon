import { useState, useCallback, useEffect } from 'react';
import { notesRepository } from '../data/notesRepository';
import { PermanentNote } from '../domain/PermanentNote';
import type { CreatePermanentNoteRequest, UpdatePermanentNoteRequest, SearchPermanentNotesResponse } from '../../../services/permanentNotesService';

/**
 * Hook for managing permanent notes
 */
export function usePermanentNotes(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = false } = options;

  const [notes, setNotes] = useState<PermanentNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notesRepository.listPermanentNotes();
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load permanent notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNote = useCallback(async (request: CreatePermanentNoteRequest): Promise<PermanentNote | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const created = await notesRepository.createPermanentNote(request);
      
      // Update local state
      setNotes(prev => [created, ...prev]);
      
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create permanent note');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateNote = useCallback(async (request: UpdatePermanentNoteRequest): Promise<PermanentNote | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await notesRepository.updatePermanentNote(request);
      
      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === updated.id ? updated : note
      ));
      
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update permanent note');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await notesRepository.deletePermanentNote(id);
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== id));
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete permanent note');
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
    createNote,
    updateNote,
    deleteNote,
    clearError: () => setError(null),
  };
}

/**
 * Hook for searching permanent notes
 */
export function usePermanentNotesSearch() {
  const [results, setResults] = useState<(SearchPermanentNotesResponse & { notes: PermanentNote[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await notesRepository.searchPermanentNotes(query);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search permanent notes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearSearch,
    clearError: () => setError(null),
  };
}
