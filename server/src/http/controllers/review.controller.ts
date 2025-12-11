import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { asyncHandler } from '../../shared/utils/errorHandler.js';
import { validateId } from '../../shared/utils/validation.js';
import { sendSuccess, sendError, sendNotFound } from '../../shared/utils/response.js';

export function makeGetReviewStatusHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const isReviewRequired = container.services.reviewEngine.isReviewRequired();
    const canCreateNewNote = container.services.reviewEngine.canCreateNewQuickNote();
    const notesRequiringReview = container.services.reviewEngine.getNotesRequiringReview();
    const activeSession = container.services.reviewEngine.getActiveReviewSession();

    return sendSuccess(res, {
      isReviewRequired,
      canCreateNewNote,
      notesRequiringReview,
      activeSession,
      reviewCount: notesRequiringReview.length
    });
  });
}

export function makeCreateReviewSessionHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const notesRequiringReview = container.services.reviewEngine.getNotesRequiringReview();
    
    if (notesRequiringReview.length === 0) {
      return sendError(res, 'No notes require review', 400);
    }

    const session = container.services.reviewEngine.createReviewSession();
    return sendSuccess(res, { session });
  });
}

export function makeGetActiveReviewSessionHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const activeSession = container.services.reviewEngine.getActiveReviewSession();
    
    if (!activeSession) {
      return sendNotFound(res, 'Active review session');
    }

    // Get the actual notes for the session
    const notes = activeSession.quickNoteIds
      .map(id => container.repositories.quickNotes.getById(id))
      .filter(note => note !== null);

    return sendSuccess(res, { 
      session: activeSession,
      notes 
    });
  });
}

export function makeProcessNoteInReviewHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    const noteId = req.params.noteId;
    const { action, permanentNoteData } = req.body || {};

    validateId(sessionId, 'Session ID');
    validateId(noteId, 'Note ID');

    if (!action || !['transform', 'discard'].includes(action)) {
      return sendError(res, 'Action must be either "transform" or "discard"', 400);
    }

    const session = container.services.reviewEngine.getActiveReviewSession();
    if (!session || session.id !== sessionId) {
      return sendNotFound(res, 'Active review session');
    }

    if (!session.quickNoteIds.includes(noteId)) {
      return sendError(res, 'Note is not part of this review session', 400);
    }

    let result = null;

    if (action === 'transform') {
      if (!permanentNoteData) {
        return sendError(res, 'Permanent note data is required for transformation', 400);
      }

      // Transform the quick note to permanent note
      result = container.services.permanentNotes.transformFromQuickNote(
        noteId,
        permanentNoteData
      );
    } else if (action === 'discard') {
      // Just delete the quick note
      container.repositories.quickNotes.delete(noteId);
    }

    // Process the note in the review session (removes it from session)
    container.services.reviewEngine.processNoteInReview(sessionId, noteId);

    // Check if session is now complete
    const updatedSession = container.services.reviewEngine.getActiveReviewSession();
    const isComplete = !updatedSession || updatedSession.isComplete;

    return sendSuccess(res, {
      action,
      result,
      sessionComplete: isComplete,
      session: updatedSession
    });
  });
}

export function makeCompleteReviewSessionHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId;
    validateId(sessionId, 'Session ID');

    const session = container.services.reviewEngine.getActiveReviewSession();
    if (!session || session.id !== sessionId) {
      return sendNotFound(res, 'Active review session');
    }

    container.services.reviewEngine.completeReviewSession(sessionId);
    
    return sendSuccess(res, { 
      message: 'Review session completed successfully',
      canCreateNewNotes: container.services.reviewEngine.canCreateNewQuickNote()
    });
  });
}