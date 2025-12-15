import { useState, useCallback, useEffect } from 'react';
import { reviewService } from '../services/reviewService';
import type { 
  ReviewStatus, 
  ActiveReviewSessionData, 
  ProcessNoteRequest, 
  QuickNote,
  ReviewSession 
} from '../types/review';

interface UseReviewOptions {
  autoLoad?: boolean;
}

export function useReview(options: UseReviewOptions = {}) {
  const { autoLoad = false } = options;

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveReviewSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviewStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await reviewService.getReviewStatus();
      setReviewStatus(status);
    } catch (err: any) {
      setError(err.message || 'Failed to load review status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadActiveSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionData = await reviewService.getActiveReviewSession();
      // null means no active session exists - this is expected, not an error
      setActiveSession(sessionData);
      if (!sessionData) {
        // Clear any previous errors since no session is a valid state
        setError(null);
      }
    } catch (err: any) {
      // Only set error for actual errors, not "no session" cases
      if (err.message && 
          !err.message.includes('No active review session') &&
          !err.message.includes('not found') &&
          !err.message.includes('404')) {
        setError(err.message || 'Failed to load active session');
      } else {
        // No session is expected - clear error and set session to null
        setActiveSession(null);
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createReviewSession = useCallback(async (): Promise<ReviewSession | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const session = await reviewService.createReviewSession();
      
      // Load the full session data
      await loadActiveSession();
      await loadReviewStatus();
      
      return session;
    } catch (err: any) {
      // Handle specific error cases
      if (err.message.includes('No notes require review')) {
        setError('No notes require review at this time');
      } else {
        setError(err.message || 'Failed to create review session');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadActiveSession, loadReviewStatus]);

  const processNote = useCallback(async (
    noteId: string, 
    request: ProcessNoteRequest
  ): Promise<boolean> => {
    if (!activeSession) {
      setError('No active review session');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await reviewService.processNoteInReview(
        activeSession.session.id,
        noteId,
        request
      );

      // Update local state by removing the processed note
      setActiveSession(prev => {
        if (!prev) return null;
        
        const updatedNotes = prev.notes.filter(note => note.id !== noteId);
        
        // If no notes left, clear the session
        if (updatedNotes.length === 0) {
          return null;
        }
        
        return {
          ...prev,
          notes: updatedNotes,
          session: result.session || prev.session
        };
      });

      // Refresh status
      await loadReviewStatus();

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to process note');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, loadReviewStatus]);

  const completeSession = useCallback(async (): Promise<boolean> => {
    if (!activeSession) {
      setError('No active review session');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await reviewService.completeReviewSession(activeSession.session.id);
      
      // Clear local state
      setActiveSession(null);
      
      // Refresh status
      await loadReviewStatus();
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to complete session');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, loadReviewStatus]);

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad) {
      loadReviewStatus();
    }
  }, [autoLoad, loadReviewStatus]);

  return {
    // State
    reviewStatus,
    activeSession,
    isLoading,
    error,
    
    // Computed
    isReviewRequired: reviewStatus?.isReviewRequired || false,
    canCreateNewNote: reviewStatus?.canCreateNewNote || false,
    reviewCount: reviewStatus?.reviewCount || 0,
    currentNote: activeSession?.notes[0] || null,
    remainingNotes: activeSession?.notes.length || 0,
    
    // Actions
    loadReviewStatus,
    loadActiveSession,
    createReviewSession,
    processNote,
    completeSession,
    
    // Utilities
    clearError: () => setError(null)
  };
}