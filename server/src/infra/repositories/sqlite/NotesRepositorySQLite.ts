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
    return notes.map((row: any) => {
      // Helper to convert string or Date to ISO string
      const toISOString = (value: string | Date | undefined | null): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (value instanceof Date) return value.toISOString();
        return null;
      };

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        tags: row.tags,
        relatedNotes: row.relatedNotes,
        createdAt: toISOString(row.createdAt) || new Date().toISOString(),
        lastModified: toISOString(row.lastModified) || new Date().toISOString(),
        conversationId: row.conversationId || row.source?.conversationId,
        messageIndex: row.messageIndex ?? row.source?.messageIndex ?? 0,
        nextReview: toISOString(row.nextReview),
        interval: row.interval ?? null,
        easiness: row.easiness ?? null,
        repetitions: row.repetitions ?? null,
        lastReview: toISOString(row.lastReview),
        lastPerformance: row.lastPerformance ?? null
      };
    });
  }

  delete(id: string): void {
    this.noteDatabase.deleteNote(id);
  }
}


