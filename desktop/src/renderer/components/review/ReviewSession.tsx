import React, { useState, useEffect } from 'react';
import { useReview } from '../../hooks/useReview';
import { NoteTransformationInterface } from './NoteTransformationInterface';
import { ReviewEmptyState } from './ReviewEmptyState';
import './ReviewSession.css';
import './MinimalReviewSession.css';

/**
 * ReviewSession - Quick Note to Permanent Note Review System
 * 
 * This component handles the review workflow for converting quick notes into permanent notes.
 * This is separate from the SRS (Spaced Repetition System) review which is in DesktopReviewPanel.
 * 
 * Flow:
 * 1. User clicks "Start Review" in NotesManagementPanel
 * 2. System creates a review session with notes requiring review
 * 3. User reviews each note and either:
 *    - Transforms it to a permanent note (with optional edits)
 *    - Discards it
 * 4. Session completes when all notes are processed
 */
interface ReviewSessionProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({ 
  onComplete, 
  onCancel 
}) => {
  const {
    activeSession,
    isLoading,
    error,
    currentNote,
    remainingNotes,
    loadActiveSession,
    createReviewSession,
    processNote,
    clearError
  } = useReview();

  const [isInitializing, setIsInitializing] = useState(true);
  const [showTransformInterface, setShowTransformInterface] = useState(false);

  // Initialize the review session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsInitializing(true);
        clearError(); // Clear any previous errors
        
        // First try to load existing active session
        // This will return null if no session exists (expected case)
        await loadActiveSession();
      } catch (err: any) {
        // Only log actual errors, not "no session" cases
        if (err.message && 
            !err.message.includes('No active review session') &&
            !err.message.includes('not found')) {
          console.error('Failed to load active session:', err);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [loadActiveSession, clearError]);

  // Create session if none exists after loading
  useEffect(() => {
    const createSessionIfNeeded = async () => {
      // Only create if we're done initializing, have no session, and no error
      if (!isInitializing && !activeSession && !error && !isLoading) {
        try {
          setIsInitializing(true);
          clearError();
          await createReviewSession();
          setIsInitializing(false);
        } catch (err: any) {
          // Don't log error if no notes require review - this is expected
          if (!err.message?.includes('No notes require review')) {
            console.error('Failed to create review session:', err);
          }
          setIsInitializing(false);
        }
      }
    };

    createSessionIfNeeded();
  }, [isInitializing, activeSession, error, createReviewSession, clearError]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
        if (showTransformInterface) {
          setShowTransformInterface(false);
        } else {
          handleCancel();
        }
      } else if (e.key === 'Enter' && currentNote) {
        e.preventDefault();
        setShowTransformInterface(true);
      } else if (e.key === 'Delete' && currentNote) {
        e.preventDefault();
        if (confirm('Are you sure you want to discard this note?')) {
          handleDiscard(currentNote.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentNote, showTransformInterface]);

  const handleTransform = async (noteId: string, permanentNoteData: {
    title?: string;
    content?: string;
    tags?: string[];
  }) => {
    const success = await processNote(noteId, {
      action: 'transform',
      permanentNoteData
    });

    if (success && remainingNotes <= 1) {
      // Session is complete
      onComplete?.();
    }
  };

  const handleDiscard = async (noteId: string) => {
    const success = await processNote(noteId, {
      action: 'discard'
    });

    if (success && remainingNotes <= 1) {
      // Session is complete
      onComplete?.();
    }
  };



  const handleCancel = () => {
    onCancel?.();
  };

  if (isInitializing || isLoading) {
    return (
      <div className="review-session loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing review session...</p>
        </div>
      </div>
    );
  }

  // Only show error for actual errors, not "no session" cases
  if (error && 
      !error.includes('No active review session') &&
      !error.includes('not found')) {
    const isNoNotesError = error.includes('No notes require review');
    
    return (
      <div className="review-session error">
        <div className="error-message">
          <h3>{isNoNotesError ? 'No Review Needed' : 'Review Session Error'}</h3>
          <p>{isNoNotesError ? 'All your notes are up to date! No review is required at this time.' : error}</p>
          <div className="error-actions">
            {!isNoNotesError && (
              <button onClick={clearError} className="btn-secondary">
                Try Again
              </button>
            )}
            <button onClick={handleCancel} className="btn-primary">
              {isNoNotesError ? 'Continue' : 'Cancel Review'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSession || !activeSession.notes?.length || !currentNote) {
    return (
      <ReviewEmptyState 
        onCancel={handleCancel}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className="minimal-review-session">
      {/* Minimal header */}
      <div className="minimal-review-header">
        <h1 className="minimal-review-title">Review Session</h1>
        <div className="minimal-review-progress">

        activeSession.notes?.length
          ? {activeSession.notes.length - remainingNotes + 1} of {activeSession.notes.length}
          : 'Loading...'

        </div>
        <button 
          onClick={handleCancel}
          className="minimal-review-cancel"
          title="Cancel Review (Esc)"
        >
          Cancel
        </button>
      </div>

      {/* Review content */}
      <div className="minimal-review-content">
        <NoteTransformationInterface
          note={currentNote}
          onTransform={(permanentNoteData) => handleTransform(currentNote.id, permanentNoteData)}
          onDiscard={() => handleDiscard(currentNote.id)}
          isProcessing={isLoading}
        />
      </div>

      {/* Keyboard hints */}
      <div className="minimal-review-hints">
        <span>Enter: Transform</span>
        <span>Delete: Discard</span>
        <span>Esc: Cancel</span>
      </div>
    </div>
  );
};