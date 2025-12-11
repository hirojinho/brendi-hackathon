import { QuickNotesRepository } from '../../domain/ports/repositories/index.js';
import { QuickNoteEntity } from '../../domain/entities/index.js';
import { ReviewEngine } from '../review/ReviewEngine.js';

export class QuickNotesService {
  constructor(
    private readonly quickNotesRepo: QuickNotesRepository,
    private readonly reviewEngine?: ReviewEngine
  ) {}

  create(note: QuickNoteEntity): void {
    // Validate content is not empty or whitespace only
    if (!note.content || note.content.trim().length === 0) {
      throw new Error('Note content cannot be empty or whitespace only');
    }

    // Check if new notes can be created (review enforcement)
    if (this.reviewEngine && !this.reviewEngine.canCreateNewQuickNote()) {
      throw new Error('Cannot create new quick note: review required or note limit reached');
    }

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

