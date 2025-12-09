import { QuickNotesRepository } from '../../../domain/ports/repositories/index.js';
import { QuickNoteEntity } from '../../../domain/entities/index.js';
import QuickNotesDatabase from '../../db/quickNotesDatabase.js';

export class QuickNotesRepositorySQLite implements QuickNotesRepository {
  constructor(private readonly quickNotesDatabase: QuickNotesDatabase = new QuickNotesDatabase()) {}

  save(note: QuickNoteEntity): void {
    this.quickNotesDatabase.saveQuickNote({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      contextId: note.contextId || null,
      createdAt: new Date(note.createdAt),
      lastModified: new Date(note.lastModified)
    });
  }

  update(id: string, update: Partial<Omit<QuickNoteEntity, 'id' | 'createdAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: QuickNoteEntity = {
      ...existing,
      ...update,
      lastModified: new Date().toISOString()
    };
    this.save(updated);
  }

  list(contextId?: string): QuickNoteEntity[] {
    return this.quickNotesDatabase.getAllQuickNotes(contextId);
  }

  getByContext(contextId: string): QuickNoteEntity[] {
    return this.quickNotesDatabase.getAllQuickNotes(contextId);
  }

  getById(id: string): QuickNoteEntity | null {
    return this.quickNotesDatabase.getQuickNote(id);
  }

  delete(id: string): void {
    this.quickNotesDatabase.deleteQuickNote(id);
  }
}

