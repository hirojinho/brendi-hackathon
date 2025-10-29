import { NotesRepository } from '../../../domain/ports/repositories/index.js';
import { NoteEntity } from '../../../domain/entities/index.js';
import NoteDatabase from '../../db/noteDatabase.js';

export class NotesRepositorySQLite implements NotesRepository {
  constructor(private readonly db: NoteDatabase = new NoteDatabase()) {}

  save(note: NoteEntity): void {
    // Adapt NoteEntity to Note type expected by NoteDatabase.saveNote
    this.db.saveNote({
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
    } as any);
  }

  updateSrsFields(
    id: string,
    fields: Partial<Pick<NoteEntity, 'nextReview' | 'interval' | 'easiness' | 'repetitions' | 'lastReview' | 'lastPerformance'>>
  ): void {
    const existing = this.list().find(n => n.id === id);
    if (!existing) return;
    const updated: NoteEntity = { ...existing, ...fields, lastModified: new Date().toISOString() } as any;
    this.save(updated);
  }

  list(): NoteEntity[] {
    const notes = this.db.getAllNotes();
    return notes.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: n.tags,
      relatedNotes: n.relatedNotes,
      createdAt: n.createdAt.toISOString(),
      lastModified: n.lastModified.toISOString(),
      conversationId: n.source.conversationId,
      messageIndex: n.source.messageIndex,
      nextReview: n.nextReview ? n.nextReview.toISOString() : null,
      interval: n.interval ?? null,
      easiness: n.easiness ?? null,
      repetitions: n.repetitions ?? null,
      lastReview: n.lastReview ? n.lastReview.toISOString() : null,
      lastPerformance: n.lastPerformance ?? null
    }));
  }

  delete(id: string): void {
    this.db.deleteNote(id);
  }
}


