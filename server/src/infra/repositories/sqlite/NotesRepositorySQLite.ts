import { NotesRepository } from '../../../domain/ports/repositories/index.js';
import { NoteEntity } from '../../../domain/entities/index.js';
import NoteDatabase from '../../db/noteDatabase.js';

export class NotesRepositorySQLite implements NotesRepository {
  constructor(private readonly noteDatabase: NoteDatabase = new NoteDatabase()) {}

  save(note: NoteEntity): void {
    // Adapt NoteEntity to Note type expected by NoteDatabase.saveNote
    this.noteDatabase.saveNote({
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
    const existing = this.list().find(note => note.id === id);
    if (!existing) return;
    const updated: NoteEntity = { ...existing, ...fields, lastModified: new Date().toISOString() } as any;
    this.save(updated);
  }

  list(): NoteEntity[] {
    const notes = this.noteDatabase.getAllNotes();
    return notes.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: row.tags,
      relatedNotes: row.relatedNotes,
      createdAt: row.createdAt.toISOString(),
      lastModified: row.lastModified.toISOString(),
      conversationId: row.source.conversationId,
      messageIndex: row.source.messageIndex,
      nextReview: row.nextReview ? row.nextReview.toISOString() : null,
      interval: row.interval ?? null,
      easiness: row.easiness ?? null,
      repetitions: row.repetitions ?? null,
      lastReview: row.lastReview ? row.lastReview.toISOString() : null,
      lastPerformance: row.lastPerformance ?? null
    }));
  }

  delete(id: string): void {
    this.noteDatabase.deleteNote(id);
  }
}


