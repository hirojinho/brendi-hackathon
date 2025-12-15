import React, { useEffect } from 'react';
import { useReviewSession } from '../hooks/useReviewSession';
import { ReviewSessionView } from './ReviewSessionView';
import { ReviewStateHelpers } from '../domain/ReviewState';

interface ReviewSessionContainerProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

/**
 * Container component for Review Session
 * Handles business logic, state management, and coordinates with hooks
 */
export const ReviewSessionContainer: React.FC<ReviewSessionContainerProps> = ({
  onComplete,
  onCancel,
}) => {
  const {
    state,
    isLoading,
    isActive,
    isCompleted,
    processNote,
    retry,
    cancel,
  } = useReviewSession({ autoInitialize: true });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const currentNote = ReviewStateHelpers.getCurrentNote(state);

      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && currentNote && isActive) {
        e.preventDefault();
        // Enter key handled by NoteTransformationInterface
      } else if (e.key === 'Delete' && currentNote && isActive) {
        e.preventDefault();
        if (confirm('Are you sure you want to discard this note?')) {
          handleDiscard(currentNote.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state, isActive]);

  // Handle session completion
  useEffect(() => {
    if (isCompleted) {
      onComplete?.();
    }
  }, [isCompleted, onComplete]);

  const handleTransform = async (
    noteId: string,
    permanentNoteData?: {
      title?: string;
      content?: string;
      tags?: string[];
    }
  ) => {
    const success = await processNote(noteId, 'transform', permanentNoteData);
    
    if (success) {
      const session = ReviewStateHelpers.getSession(state);
      if (session && session.remainingCount <= 1) {
        // Last note processed - will trigger completion in useEffect
      }
    }
  };

  const handleDiscard = async (noteId: string) => {
    const success = await processNote(noteId, 'discard');
    
    if (success) {
      const session = ReviewStateHelpers.getSession(state);
      if (session && session.remainingCount <= 1) {
        // Last note processed - will trigger completion in useEffect
      }
    }
  };

  const handleCancel = () => {
    cancel();
    onCancel?.();
  };

  return (
    <ReviewSessionView
      state={state}
      onTransform={handleTransform}
      onDiscard={handleDiscard}
      onCancel={handleCancel}
      onRetry={retry}
      isProcessing={isLoading}
    />
  );
};
