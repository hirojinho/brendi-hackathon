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

      const existing = container.services.notes.list().map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        tags: n.tags,
        relatedNotes: n.relatedNotes,
        createdAt: new Date(n.createdAt),
        lastModified: new Date(n.lastModified),
        source: { conversationId: n.conversationId, messageIndex: n.messageIndex },
        nextReview: n.nextReview ? new Date(n.nextReview) : undefined,
        interval: n.interval ?? undefined,
        easiness: n.easiness ?? undefined,
        repetitions: n.repetitions ?? undefined,
        lastReview: n.lastReview ? new Date(n.lastReview) : undefined,
        lastPerformance: n.lastPerformance ?? undefined
      })) as any[];

      const prompt = buildNoteGenerationPrompt(content);
      const provider = model === 'openrouter'
        ? container.providers.llm.openrouter
        : model === 'ollama'
          ? container.providers.llm.ollama
          : container.providers.llm.openai;
      const raw = await provider.generateResponse(prompt, [], modelName);
      const cleaned = raw.replace(/```json|```/g, '').trim();
      let notes: any[] = [];
      try {
        const parsed = JSON.parse(cleaned);
        const arr = Array.isArray(parsed.notes) ? parsed.notes : [];
        notes = arr.filter((n: any) => n && n.title && n.content && Array.isArray(n.tags));
      } catch {
        notes = [];
      }

      if (notes.length > 0) {
        const nowIso = new Date().toISOString();
        for (const note of notes) {
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

      return res.json({ notes });
    } catch (err) {
      console.error('[HTTP] /api/note error', err);
      return res.status(500).json({ error: 'Failed to generate note' });
    }
  };
}

export function makeListNotesHandler(container: Container) {
  return (_req: Request, res: Response) => {
    try {
      const notes = container.services.notes.list().map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        tags: n.tags,
        relatedNotes: n.relatedNotes,
        createdAt: n.createdAt,
        lastModified: n.lastModified,
        source: { conversationId: n.conversationId, messageIndex: n.messageIndex },
        nextReview: n.nextReview || undefined,
        interval: n.interval || undefined,
        easiness: n.easiness || undefined,
        repetitions: n.repetitions || undefined,
        lastReview: n.lastReview || undefined,
        lastPerformance: n.lastPerformance || undefined
      }));
      return res.json({ notes });
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


