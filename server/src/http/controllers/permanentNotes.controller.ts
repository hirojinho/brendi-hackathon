import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { asyncHandler } from '../../shared/utils/errorHandler.js';
import { validateRequired, validateId, validateArray } from '../../shared/utils/validation.js';
import { sendSuccess, sendError, sendNotFound } from '../../shared/utils/response.js';

export function makeCreatePermanentNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { title, content, tags = [], sourceQuickNoteId } = req.body || {};
    
    validateRequired(title, 'Title');
    validateRequired(content, 'Content');
    validateArray(tags, 'Tags');

    const permanentNote = container.services.permanentNotes.create({
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      sourceQuickNoteId: sourceQuickNoteId || undefined
    });

    return sendSuccess(res, { note: permanentNote });
  });
}

export function makeTransformQuickNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const quickNoteId = req.params.quickNoteId;
    const { title, content, tags } = req.body || {};
    
    validateId(quickNoteId, 'Quick Note ID');

    try {
      const permanentNote = container.services.permanentNotes.transformFromQuickNote(
        quickNoteId,
        {
          title,
          content,
          tags: Array.isArray(tags) ? tags : undefined
        }
      );

      return sendSuccess(res, { note: permanentNote });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return sendNotFound(res, 'Quick note');
      }
      throw error;
    }
  });
}

export function makeListPermanentNotesHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const permanentNotes = container.services.permanentNotes.getAllNotes();
    return sendSuccess(res, { notes: permanentNotes });
  });
}

export function makeSearchPermanentNotesHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    
    if (!query || query.trim().length === 0) {
      return sendError(res, 'Search query is required', 400);
    }

    const searchResults = container.services.permanentNotes.search(query);
    return sendSuccess(res, { 
      notes: searchResults,
      query: query.trim(),
      count: searchResults.length
    });
  });
}

export function makeGetPermanentNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Note ID');

    const note = container.services.permanentNotes.getById(id);
    if (!note) {
      return sendNotFound(res, 'Permanent note');
    }

    return sendSuccess(res, { note });
  });
}

export function makeUpdatePermanentNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { title, content, tags } = req.body || {};

    validateId(id, 'Note ID');

    const existing = container.services.permanentNotes.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Permanent note');
    }

    const update: any = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (tags !== undefined) {
      validateArray(tags, 'Tags');
      update.tags = Array.isArray(tags) ? tags : existing.tags;
    }

    container.services.permanentNotes.update(id, update);

    const updated = container.services.permanentNotes.getById(id);
    return sendSuccess(res, { note: updated });
  });
}

export function makeDeletePermanentNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Note ID');

    const existing = container.services.permanentNotes.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Permanent note');
    }

    container.services.permanentNotes.delete(id);
    return sendSuccess(res, { message: 'Permanent note deleted successfully' });
  });
}