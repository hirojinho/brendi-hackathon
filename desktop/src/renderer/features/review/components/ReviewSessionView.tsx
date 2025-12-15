import React from 'react';
import { ReviewState, ReviewStateHelpers } from '../domain/ReviewState';
import { NoteTransformationInterface } from '../../../components/review/NoteTransformationInterface';
import { ReviewEmptyState } from '../../../components/review/ReviewEmptyState';
// Import styles from the original location
import '../../../components/review/ReviewSession.css';
import '../../../components/review/MinimalReviewSession.css';

interface ReviewSessionViewProps {
  state: ReviewState;
  onTransform: (noteId: string, permanentNoteData?: {
    title?: string;
    content?: string;
    tags?: string[];
  }) => void;
  onDiscard: (noteId: string) => void;
  onCancel: () => void;
  onRetry?: () => void;
  isProcessing?: boolean;
}

/**
 * Presentational component for Review Session
 * Pure UI component - no business logic, just renders based on state
 */
export const ReviewSessionView: React.FC<ReviewSessionViewProps> = ({
  state,
  onTransform,
  onDiscard,
  onCancel,
  onRetry,
  isProcessing = false,
}) => {
  // Loading state
  if (ReviewStateHelpers.isLoading(state)) {
    return (
      <div className="review-session loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initializing review session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (ReviewStateHelpers.isError(state)) {
    const error = ReviewStateHelpers.getError(state);
    const isNoNotesError = error?.includes('No notes require review');
    const isRecoverable = state.type === 'error' && state.recoverable !== false;
    
    return (
      <div className="review-session error">
        <div className="error-message">
          <h3>{isNoNotesError ? 'No Review Needed' : 'Review Session Error'}</h3>
          <p>
            {isNoNotesError
              ? 'All your notes are up to date! No review is required at this time.'
              : error}
          </p>
          <div className="error-actions">
            {isRecoverable && !isNoNotesError && onRetry && (
              <button onClick={onRetry} className="btn-secondary">
                Try Again
              </button>
            )}
            <button onClick={onCancel} className="btn-primary">
              {isNoNotesError ? 'Continue' : 'Cancel Review'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Completed state
  if (ReviewStateHelpers.isCompleted(state)) {
    return (
      <ReviewEmptyState
        onCancel={onCancel}
        onComplete={onCancel}
      />
    );
  }

  // Active state - show review interface
  if (ReviewStateHelpers.isActive(state)) {
    const session = ReviewStateHelpers.getSession(state);
    const currentNote = ReviewStateHelpers.getCurrentNote(state);

    if (!session || !currentNote) {
      return (
        <ReviewEmptyState
          onCancel={onCancel}
          onComplete={onCancel}
        />
      );
    }

    return (
      <div className="minimal-review-session">
        {/* Minimal header */}
        <div className="minimal-review-header">
          <h1 className="minimal-review-title">Review Session</h1>
          <div className="minimal-review-progress">
            {session.currentNoteIndex} of {session.totalCount}
          </div>
          <button
            onClick={onCancel}
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
            onTransform={(permanentNoteData) => onTransform(currentNote.id, permanentNoteData)}
            onDiscard={() => onDiscard(currentNote.id)}
            isProcessing={isProcessing}
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
  }

  // Idle state - shouldn't normally render, but handle gracefully
  return (
    <ReviewEmptyState
      onCancel={onCancel}
      onComplete={onCancel}
    />
  );
};
