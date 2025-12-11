import React, { useState, useEffect } from 'react';
import { useReview } from '../../hooks/useReview';
import { NoteTransformationInterface } from './NoteTransformationInterface';
import { ReviewProgress } from './ReviewProgress';
import { ReviewEmptyState } from './ReviewEmptyState';
import type { QuickNote } from '../../types/review';
import './ReviewSession.css';

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
    completeSession,
    clearError
  } = useReview();

  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize the review session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsInitializing(true);
        
        // First try to load existing active session
        await loadActiveSession();
        
        // If no active session, create one
        if (!activeSession) {
          await createReviewSession();
        }
      } catch (err) {
        console.error('Failed to initialize review session:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeSession();
  }, []);

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

  const handleCompleteSession = async () => {
    const success = await completeSession();
    if (success) {
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
    return (
      <div className="review-session error">
        <div className="error-message">
          <h3>Review Session Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={clearError} className="btn-secondary">
              Try Again
            </button>
            <button onClick={handleCancel} className="btn-primary">
              Cancel Review
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
    <div className="review-session">
      <div className="review-header">
        <h2>Review Notes</h2>
        <button 
          onClick={handleCancel}
          className="cancel-button"
          title="Cancel Review"
        >
          ×
        </button>
      </div>

      <ReviewProgress 
        current={activeSession.notes.length - remainingNotes + 1}
        total={activeSession.notes.length}
        remaining={remainingNotes}
      />

      <NoteTransformationInterface
        note={currentNote}
        onTransform={(permanentNoteData) => handleTransform(currentNote.id, permanentNoteData)}
        onDiscard={() => handleDiscard(currentNote.id)}
        isProcessing={isLoading}
      />

      {remainingNotes === 1 && (
        <div className="session-completion">
          <p>This is the last note in your review session.</p>
          <button 
            onClick={handleCompleteSession}
            className="btn-primary complete-session-btn"
            disabled={isLoading}
          >
            Complete Review Session
          </button>
        </div>
      )}
    </div>
  );
};