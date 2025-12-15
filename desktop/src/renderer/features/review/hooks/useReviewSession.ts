import { useReducer, useCallback, useEffect } from 'react';
import { reviewRepository } from '../data/reviewRepository';
import {
  reviewStateReducer,
  ReviewState,
  ReviewEvent,
  ReviewStateHelpers,
} from '../domain/ReviewState';
import { ReviewSession } from '../domain/ReviewSession';

/**
 * Hook for managing review session state machine
 * Handles initialization, session creation, and state transitions
 */
export function useReviewSession(options: { autoInitialize?: boolean } = {}) {
  const { autoInitialize = false } = options;

  const [state, dispatch] = useReducer(reviewStateReducer, { type: 'idle' });

  const initialize = useCallback(async () => {
    dispatch({ type: 'INITIALIZE' });
    
    try {
      const session = await reviewRepository.getActiveSession();
      
      if (session) {
        dispatch({ type: 'SESSION_FOUND', session });
      } else {
        dispatch({ type: 'SESSION_NOT_FOUND' });
      }
    } catch (err: any) {
      // Check if it's a "no session" error (expected)
      if (err.message?.includes('No active review session') ||
          err.message?.includes('not found') ||
          err.message?.includes('404')) {
        dispatch({ type: 'SESSION_NOT_FOUND' });
      } else {
        dispatch({
          type: 'ERROR',
          error: err.message || 'Failed to initialize review session',
          recoverable: true,
        });
      }
    }
  }, []);

  const createSession = useCallback(async () => {
    dispatch({ type: 'CREATE_SESSION' });
    
    try {
      const session = await reviewRepository.createSession();
      dispatch({ type: 'SESSION_CREATED', session });
    } catch (err: any) {
      // Check if it's a "no notes" error (expected)
      if (err.message?.includes('No notes require review')) {
        dispatch({
          type: 'ERROR',
          error: 'No notes require review at this time',
          recoverable: false,
        });
      } else {
        dispatch({
          type: 'ERROR',
          error: err.message || 'Failed to create review session',
          recoverable: true,
        });
      }
    }
  }, []);

  const processNote = useCallback(async (
    noteId: string,
    action: 'transform' | 'discard',
    permanentNoteData?: {
      title?: string;
      content?: string;
      tags?: string[];
    }
  ) => {
    const session = ReviewStateHelpers.getSession(state);
    if (!session) {
      dispatch({
        type: 'ERROR',
        error: 'No active session',
        recoverable: false,
      });
      return false;
    }

    dispatch({ type: 'PROCESS_NOTE', noteId, action });

    try {
      const result = await reviewRepository.processNote(session.id, noteId, {
        action,
        permanentNoteData,
      });

      // Update session by removing processed note
      const updatedSession = session.processNote(noteId);
      
      dispatch({ type: 'NOTE_PROCESSED', updatedSession });
      
      return true;
    } catch (err: any) {
      dispatch({
        type: 'ERROR',
        error: err.message || 'Failed to process note',
        recoverable: true,
      });
      return false;
    }
  }, [state]);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' });
    initialize();
  }, [initialize]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: 'CANCEL' });
  }, []);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInitialize && state.type === 'idle') {
      initialize();
    }
  }, [autoInitialize, state.type, initialize]);

  // Auto-create session if needed
  useEffect(() => {
    if (state.type === 'creating_session') {
      createSession();
    }
  }, [state.type, createSession]);

  return {
    state,
    isLoading: ReviewStateHelpers.isLoading(state),
    isActive: ReviewStateHelpers.isActive(state),
    isError: ReviewStateHelpers.isError(state),
    isCompleted: ReviewStateHelpers.isCompleted(state),
    session: ReviewStateHelpers.getSession(state),
    currentNote: ReviewStateHelpers.getCurrentNote(state),
    error: ReviewStateHelpers.getError(state),
    initialize,
    createSession,
    processNote,
    retry,
    reset,
    cancel,
  };
}
