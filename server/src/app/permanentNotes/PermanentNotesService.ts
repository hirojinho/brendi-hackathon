import { PermanentNotesRepository, QuickNotesRepository } from '../../domain/ports/repositories/index.js';
import { PermanentNoteEntity, QuickNoteEntity } from '../../domain/entities/index.js';
import { randomUUID } from 'crypto';

export class PermanentNotesService {
  constructor(
    private readonly permanentNotesRepo: PermanentNotesRepository,
    private readonly quickNotesRepo?: QuickNotesRepository
  ) {}

  /**
   * Create a new permanent note
   */
  create(note: Omit<PermanentNoteEntity, 'id' | 'createdAt' | 'updatedAt'>): PermanentNoteEntity {
    const now = new Date();
    const permanentNote: PermanentNoteEntity = {
      id: randomUUID(),
      title: note.title,
      content: note.content,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags: note.tags,
      sourceQuickNoteId: note.sourceQuickNoteId
    };

    this.permanentNotesRepo.save(permanentNote);
    return permanentNote;
  }

  /**
   * Transform a quick note into a permanent note
   * Requirements: 3.2, 3.3
   */
  transformFromQuickNote(quickNoteId: string, enhancedContent?: {
    title?: string;
    content?: string;
    tags?: string[];
  }): PermanentNoteEntity {
    if (!this.quickNotesRepo) {
      throw new Error('QuickNotesRepository is required for note transformation');
    }

    const quickNote = this.quickNotesRepo.getById(quickNoteId);
    if (!quickNote) {
      throw new Error(`Quick note with id ${quickNoteId} not found`);
    }

    const now = new Date();
    const permanentNote: PermanentNoteEntity = {
      id: randomUUID(),
      title: enhancedContent?.title || quickNote.title,
      content: enhancedContent?.content || quickNote.content,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags: enhancedContent?.tags || quickNote.tags,
      sourceQuickNoteId: quickNote.id
    };

    this.permanentNotesRepo.save(permanentNote);
    
    // Remove the quick note after successful transformation
    this.quickNotesRepo.delete(quickNoteId);
    
    return permanentNote;
  }

  /**
   * Get all permanent notes (knowledge base)
   * Requirements: 5.1
   */
  getAllNotes(): PermanentNoteEntity[] {
    return this.permanentNotesRepo.list();
  }

  /**
   * Search permanent notes by content and title
   * Requirements: 5.2
   */
  search(query: string): PermanentNoteEntity[] {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.permanentNotesRepo.search(query.trim());
  }

  /**
   * Get a permanent note by ID
   */
  getById(id: string): PermanentNoteEntity | null {
    return this.permanentNotesRepo.getById(id);
  }

  /**
   * Update a permanent note
   */
  update(id: string, update: Partial<Omit<PermanentNoteEntity, 'id' | 'createdAt'>>): void {
    const updateWithTimestamp = {
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.permanentNotesRepo.update(id, updateWithTimestamp);
  }

  /**
   * Delete a permanent note
   */
  delete(id: string): void {
    this.permanentNotesRepo.delete(id);
  }
}