import type { QuickNote } from '../../../types/review';
import { ReviewSession } from './ReviewSession';

/**
 * Review State Machine
 * 
 * Manages the lifecycle of a review session with clear state transitions.
 * Prevents invalid states and makes the flow explicit.
 */

export type ReviewState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'checking_session' }
  | { type: 'creating_session' }
  | { type: 'active'; session: ReviewSession; currentNote: QuickNote }
  | { type: 'processing'; session: ReviewSession; noteId: string; action: 'transform' | 'discard' }
  | { type: 'completed' }
  | { type: 'error'; error: string; recoverable?: boolean };

export type ReviewEvent =
  | { type: 'INITIALIZE' }
  | { type: 'SESSION_FOUND'; session: ReviewSession }
  | { type: 'SESSION_NOT_FOUND' }
  | { type: 'CREATE_SESSION' }
  | { type: 'SESSION_CREATED'; session: ReviewSession }
  | { type: 'PROCESS_NOTE'; noteId: string; action: 'transform' | 'discard' }
  | { type: 'NOTE_PROCESSED'; updatedSession: ReviewSession }
  | { type: 'ERROR'; error: string; recoverable?: boolean }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

/**
 * State machine reducer
 * Defines valid state transitions
 */
export function reviewStateReducer(
  state: ReviewState,
  event: ReviewEvent
): ReviewState {
  switch (state.type) {
    case 'idle':
      if (event.type === 'INITIALIZE') {
        return { type: 'checking_session' };
      }
      break;

    case 'checking_session':
      if (event.type === 'SESSION_FOUND') {
        const currentNote = event.session.currentNote;
        if (currentNote) {
          return {
            type: 'active',
            session: event.session,
            currentNote,
          };
        }
        return { type: 'completed' };
      }
      if (event.type === 'SESSION_NOT_FOUND') {
        return { type: 'creating_session' };
      }
      if (event.type === 'ERROR') {
        return { type: 'error', error: event.error, recoverable: event.recoverable ?? true };
      }
      break;

    case 'creating_session':
      if (event.type === 'SESSION_CREATED') {
        const currentNote = event.session.currentNote;
        if (currentNote) {
          return {
            type: 'active',
            session: event.session,
            currentNote,
          };
        }
        return { type: 'completed' };
      }
      if (event.type === 'ERROR') {
        return { type: 'error', error: event.error, recoverable: event.recoverable ?? true };
      }
      break;

    case 'active':
      if (event.type === 'PROCESS_NOTE') {
        return {
          type: 'processing',
          session: state.session,
          noteId: event.noteId,
          action: event.action,
        };
      }
      if (event.type === 'CANCEL') {
        return { type: 'idle' };
      }
      break;

    case 'processing':
      if (event.type === 'NOTE_PROCESSED') {
        const currentNote = event.updatedSession.currentNote;
        if (currentNote) {
          return {
            type: 'active',
            session: event.updatedSession,
            currentNote,
          };
        }
        return { type: 'completed' };
      }
      if (event.type === 'ERROR') {
        return {
          type: 'error',
          error: event.error,
          recoverable: event.recoverable ?? true,
        };
      }
      break;

    case 'error':
      if (event.type === 'RETRY') {
        return { type: 'checking_session' };
      }
      if (event.type === 'RESET') {
        return { type: 'idle' };
      }
      break;

    case 'completed':
      if (event.type === 'RESET') {
        return { type: 'idle' };
      }
      break;
  }

  // Invalid transition - return current state
  console.warn(`Invalid state transition: ${state.type} -> ${event.type}`);
  return state;
}

/**
 * Helper functions to check state
 */
export const ReviewStateHelpers = {
  isLoading(state: ReviewState): boolean {
    return state.type === 'loading' || 
           state.type === 'checking_session' || 
           state.type === 'creating_session' || 
           state.type === 'processing';
  },

  isActive(state: ReviewState): boolean {
    return state.type === 'active';
  },

  isError(state: ReviewState): boolean {
    return state.type === 'error';
  },

  isCompleted(state: ReviewState): boolean {
    return state.type === 'completed';
  },

  canProcessNote(state: ReviewState): boolean {
    return state.type === 'active';
  },

  getSession(state: ReviewState): ReviewSession | null {
    if (state.type === 'active' || state.type === 'processing') {
      return state.session;
    }
    return null;
  },

  getCurrentNote(state: ReviewState): QuickNote | null {
    if (state.type === 'active') {
      return state.currentNote;
    }
    return null;
  },

  getError(state: ReviewState): string | null {
    if (state.type === 'error') {
      return state.error;
    }
    return null;
  },
};
