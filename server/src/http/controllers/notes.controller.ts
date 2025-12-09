import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { buildNoteGenerationPrompt } from '../../domain/prompts/note.js';
import { asyncHandler, handleError } from '../../shared/utils/errorHandler.js';
import { validateRequired, validateString } from '../../shared/utils/validation.js';
import { sendSuccess, sendError } from '../../shared/utils/response.js';

export function makeCreateNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { content, model = 'openai', modelName } = req.body || {};
    
    if (!content) {
      return sendError(res, 'Content is required', 400);
    }

    // Minimal allow logic: ensure non-trivial content
    if (content.length < 100) {
      return sendSuccess(res, { notes: [] });
    }

    const existingNotesForDedup = container.services.notes.list().map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      relatedNotes: note.relatedNotes,
      createdAt: new Date(note.createdAt),
      lastModified: new Date(note.lastModified),
      source: { conversationId: note.conversationId, messageIndex: note.messageIndex },
      nextReview: note.nextReview ? new Date(note.nextReview) : undefined,
      interval: note.interval ?? undefined,
      easiness: note.easiness ?? undefined,
      repetitions: note.repetitions ?? undefined,
      lastReview: note.lastReview ? new Date(note.lastReview) : undefined,
      lastPerformance: note.lastPerformance ?? undefined
    })) as any[];

    const prompt = buildNoteGenerationPrompt(content);
    const selectedProvider = model === 'openrouter'
      ? container.providers.llm.openrouter
      : model === 'ollama'
        ? container.providers.llm.ollama
        : container.providers.llm.openai;

    const providerResponse = await selectedProvider.generateResponse(prompt, [], modelName);
    const cleanedResponse = providerResponse.replace(/```json|```/g, '').trim();
    
    let generatedNotes: any[] = [];
    try {
      const parsed = JSON.parse(cleanedResponse);
      const parsedNotesArray = Array.isArray(parsed.notes) ? parsed.notes : [];
      generatedNotes = parsedNotesArray.filter((candidate: any) => 
        candidate && candidate.title && candidate.content && Array.isArray(candidate.tags)
      );
    } catch {
      generatedNotes = [];
    }

    if (generatedNotes.length > 0) {
      const nowIso = new Date().toISOString();
      for (const note of generatedNotes) {
        container.services.notes.create({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          relatedNotes: note.relatedNotes || [],
          createdAt: nowIso,
          lastModified: nowIso,
          conversationId: 'chat',
          messageIndex: 0,
          nextReview: null,
          interval: null,
          easiness: null,
          repetitions: null,
          lastReview: null,
          lastPerformance: null
        });
      }
    }

    return sendSuccess(res, { notes: generatedNotes });
  });
}

export function makeListNotesHandler(container: Container) {
  return asyncHandler(async (_req: Request, res: Response) => {
    const notesList = container.services.notes.list().map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      relatedNotes: note.relatedNotes,
      createdAt: note.createdAt,
      lastModified: note.lastModified,
      source: { conversationId: note.conversationId, messageIndex: note.messageIndex },
      nextReview: note.nextReview || undefined,
      interval: note.interval || undefined,
      easiness: note.easiness || undefined,
      repetitions: note.repetitions || undefined,
      lastReview: note.lastReview || undefined,
      lastPerformance: note.lastPerformance || undefined
    }));

    return sendSuccess(res, { notes: notesList });
  });
}

export function makeDeleteNoteHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateRequired(id, 'Note ID');

    const existingNote = container.services.notes.list().find(n => n.id === id);
    if (!existingNote) {
      return sendError(res, 'Note not found', 404);
    }

    container.services.notes.delete(id);
    return sendSuccess(res, { message: 'Note deleted successfully' });
  });
}

export function makeUpdateNoteSrsHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { nextReview, interval, easiness, repetitions, lastReview, lastPerformance } = req.body || {};
    
    validateRequired(id, 'Note ID');

    // Validate SRS fields
    if (interval !== undefined && (typeof interval !== 'number' || interval < 0)) {
      return sendError(res, 'Invalid interval value', 400);
    }
    if (easiness !== undefined && (typeof easiness !== 'number' || easiness < 1.3)) {
      return sendError(res, 'Invalid easiness value', 400);
    }
    if (repetitions !== undefined && (typeof repetitions !== 'number' || repetitions < 0)) {
      return sendError(res, 'Invalid repetitions value', 400);
    }
    if (lastPerformance !== undefined && (typeof lastPerformance !== 'number' || lastPerformance < 0 || lastPerformance > 5)) {
      return sendError(res, 'Invalid performance value', 400);
    }

    container.services.notes.updateSrs(id, { 
      nextReview, 
      interval, 
      easiness, 
      repetitions, 
      lastReview, 
      lastPerformance 
    });

    const updated = container.services.notes.list().find(n => n.id === id);
    if (!updated) {
      return sendError(res, 'Note not found', 404);
    }

    return sendSuccess(res, { note: updated });
  });
}

export function makeNoteTakingAgentHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { input, model = 'openai', modelName, currentContextId } = req.body || {};
    
    validateRequired(input, 'Input');
    validateString(input, 'Input');

    const result = await container.services.noteTakingAgent.processInput({
      input,
      model: model as 'openai' | 'openrouter' | 'ollama',
      modelName,
      currentContextId
    });

    return sendSuccess(res, result);
  });
}
