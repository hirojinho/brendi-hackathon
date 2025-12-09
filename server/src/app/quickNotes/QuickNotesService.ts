import { QuickNotesRepository } from '../../domain/ports/repositories/index.js';
import { QuickNoteEntity } from '../../domain/entities/index.js';

export class QuickNotesService {
  constructor(private readonly quickNotesRepo: QuickNotesRepository) {}

  create(note: QuickNoteEntity): void {
    this.quickNotesRepo.save(note);
  }

  list(contextId?: string): QuickNoteEntity[] {
    return this.quickNotesRepo.list(contextId);
  }

  getByContext(contextId: string): QuickNoteEntity[] {
    return this.quickNotesRepo.getByContext(contextId);
  }

  getById(id: string): QuickNoteEntity | null {
    return this.quickNotesRepo.getById(id);
  }

  update(id: string, update: Partial<Omit<QuickNoteEntity, 'id' | 'createdAt'>>): void {
    this.quickNotesRepo.update(id, update);
  }

  delete(id: string): void {
    this.quickNotesRepo.delete(id);
  }
}

