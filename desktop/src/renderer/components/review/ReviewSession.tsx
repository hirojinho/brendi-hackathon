import React, { useState, useEffect } from 'react';
import { useReview } from '../../hooks/useReview';
import { NoteTransformationInterface } from './NoteTransformationInterface';
import { ReviewEmptyState } from './ReviewEmptyState';
import './ReviewSession.css';
import './MinimalReviewSession.css';

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
        
        // First try to load existing active session
        await loadActiveSession();
      } catch (err) {
        console.error('Failed to load active session:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, [loadActiveSession]);

  // Create session if none exists after loading and review is actually needed
  useEffect(() => {
    const createSessionIfNeeded = async () => {
      if (!isInitializing && !activeSession && !error) {
        try {
          setIsInitializing(true);
          await createReviewSession();
        } catch (err: any) {
          // Don't log error if no notes require review - this is expected
          if (!err.message?.includes('No notes require review')) {
            console.error('Failed to create review session:', err);
          }
        } finally {
          setIsInitializing(false);
        }
      }
    };

    createSessionIfNeeded();
  }, [isInitializing, activeSession, error, createReviewSession]);

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

  if (error) {
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

  if (!activeSession || !currentNote) {
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
          {activeSession.notes.length - remainingNotes + 1} of {activeSession.notes.length}
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