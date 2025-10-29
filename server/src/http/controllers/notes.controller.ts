import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { buildNoteGenerationPrompt } from '../../domain/prompts/note.js';

export function makeCreateNoteHandler(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { content, model = 'openai', modelName } = req.body || {};
      if (!content) return res.status(400).json({ error: 'Content is required' });

      // Minimal allow logic: ensure non-trivial content
      if (!content || content.length < 100) return res.json({ notes: [] });

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
        generatedNotes = parsedNotesArray.filter((candidate: any) => candidate && candidate.title && candidate.content && Array.isArray(candidate.tags));
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

      return res.json({ notes: generatedNotes });
    } catch (err) {
      console.error('[HTTP] /api/note error', err);
      return res.status(500).json({ error: 'Failed to generate note' });
    }
  };
}

export function makeListNotesHandler(container: Container) {
  return (_req: Request, res: Response) => {
    try {
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

      return res.json({ notes: notesList });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve notes' });
    }
  };
}

export function makeDeleteNoteHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      container.services.notes.delete(req.params.id);
      return res.json({ message: 'Note deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  };
}

export function makeUpdateNoteSrsHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { nextReview, interval, easiness, repetitions, lastReview, lastPerformance } = req.body || {};
      // Basic validations (keep minimal)
      if (interval !== undefined && (typeof interval !== 'number' || interval < 0)) return res.status(400).json({ error: 'Invalid interval value' });
      if (easiness !== undefined && (typeof easiness !== 'number' || easiness < 1.3)) return res.status(400).json({ error: 'Invalid easiness value' });
      if (repetitions !== undefined && (typeof repetitions !== 'number' || repetitions < 0)) return res.status(400).json({ error: 'Invalid repetitions value' });
      if (lastPerformance !== undefined && (typeof lastPerformance !== 'number' || lastPerformance < 0 || lastPerformance > 5)) return res.status(400).json({ error: 'Invalid performance value' });

      container.services.notes.updateSrs(id, { nextReview, interval, easiness, repetitions, lastReview, lastPerformance });

      const updated = container.services.notes.list().find(n => n.id === id);
      if (!updated) return res.status(404).json({ error: 'Note not found' });

      return res.json({ note: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update note SRS fields' });
    }
  };
}


