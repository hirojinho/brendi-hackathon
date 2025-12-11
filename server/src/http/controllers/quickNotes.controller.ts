import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../../shared/utils/errorHandler.js';
import { validateRequired, validateId, validateArray } from '../../shared/utils/validation.js';
import { sendSuccess, sendError, sendNotFound } from '../../shared/utils/response.js';

export function makeCreateQuickNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { title, content, tags = [], contextId = null } = req.body || {};
    
    validateRequired(title, 'Title');
    validateRequired(content, 'Content');
    validateArray(tags, 'Tags');

    const nowIso = new Date().toISOString();
    const quickNote = {
      id: uuidv4(),
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      contextId: contextId || null,
      createdAt: nowIso,
      lastModified: nowIso,
      isReviewRequired: false
    };

    container.services.quickNotes.create(quickNote);
    return sendSuccess(res, { note: quickNote });
  });
}

export function makeListQuickNotesHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const quickNotes = container.services.quickNotes.list();
    return sendSuccess(res, { notes: quickNotes });
  });
}

export function makeGetQuickNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Note ID');

    const note = container.services.quickNotes.getById(id);
    if (!note) {
      return sendNotFound(res, 'Quick note');
    }

    return sendSuccess(res, { note });
  });
}

export function makeUpdateQuickNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { title, content, tags, contextId } = req.body || {};

    validateId(id, 'Note ID');

    const existing = container.services.quickNotes.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Quick note');
    }

    const update: any = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (tags !== undefined) {
      validateArray(tags, 'Tags');
      update.tags = Array.isArray(tags) ? tags : existing.tags;
    }
    if (contextId !== undefined) update.contextId = contextId || null;

    container.services.quickNotes.update(id, update);

    const updated = container.services.quickNotes.getById(id);
    return sendSuccess(res, { note: updated });
  });
}

export function makeDeleteQuickNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Note ID');

    const existing = container.services.quickNotes.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Quick note');
    }

    container.services.quickNotes.delete(id);
    return sendSuccess(res, { message: 'Quick note deleted successfully' });
  });
}

export function makeGetQuickNotesStatusHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const quickNotes = container.services.quickNotes.list();
    const reviewEngine = container.services.reviewEngine;
    
    const currentCount = quickNotes.length;
    const maxQuickNotes = container.config.quickNotes.maxQuickNotes;
    const canCreateNew = reviewEngine.canCreateNewQuickNote();
    const isReviewRequired = reviewEngine.isReviewRequired();
    const notesRequiringReview = reviewEngine.getNotesRequiringReview();
    
    return sendSuccess(res, {
      status: {
        currentCount,
        maxQuickNotes,
        canCreateNew,
        isReviewRequired,
        notesRequiringReviewCount: notesRequiringReview.length,
        isAtLimit: currentCount >= maxQuickNotes,
        remainingSlots: Math.max(0, maxQuickNotes - currentCount)
      }
    });
  });
}
