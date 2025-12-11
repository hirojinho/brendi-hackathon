import { PermanentNotesRepository } from '../../../domain/ports/repositories/index.js';
import { PermanentNoteEntity } from '../../../domain/entities/index.js';
import QuickNotesDatabase from '../../db/quickNotesDatabase.js';

export class PermanentNotesRepositorySQLite implements PermanentNotesRepository {
  constructor(private readonly quickNotesDatabase: QuickNotesDatabase = new QuickNotesDatabase()) {}

  save(note: PermanentNoteEntity): void {
    this.quickNotesDatabase.savePermanentNote({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
      tags: note.tags,
      sourceQuickNoteId: note.sourceQuickNoteId
    });
  }

  update(id: string, update: Partial<Omit<PermanentNoteEntity, 'id' | 'createdAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: PermanentNoteEntity = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.save(updated);
  }

  list(): PermanentNoteEntity[] {
    return this.quickNotesDatabase.getAllPermanentNotes();
  }

  getById(id: string): PermanentNoteEntity | null {
    return this.quickNotesDatabase.getPermanentNote(id);
  }

  delete(id: string): void {
    this.quickNotesDatabase.deletePermanentNote(id);
  }

  search(query: string): PermanentNoteEntity[] {
    return this.quickNotesDatabase.searchPermanentNotes(query);
  }
}