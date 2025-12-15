import { quickNotesService, type QuickNote as QuickNoteData, type UpdateQuickNoteRequest, type QuickNotesStatus } from '../../../services/quickNotesService';
import { permanentNotesService, type PermanentNote as PermanentNoteData, type CreatePermanentNoteRequest, type UpdatePermanentNoteRequest, type SearchPermanentNotesResponse } from '../../../services/permanentNotesService';
import { QuickNote } from '../domain/QuickNote';
import { PermanentNote } from '../domain/PermanentNote';

/**
 * Repository interface for notes data access
 */
export interface NotesRepository {
  // Quick Notes
  listQuickNotes(contextId?: string): Promise<QuickNote[]>;
  getQuickNote(id: string): Promise<QuickNote>;
  updateQuickNote(request: UpdateQuickNoteRequest): Promise<QuickNote>;
  deleteQuickNote(id: string): Promise<void>;
  getQuickNotesStatus(): Promise<QuickNotesStatus>;

  // Permanent Notes
  listPermanentNotes(): Promise<PermanentNote[]>;
  searchPermanentNotes(query: string): Promise<SearchPermanentNotesResponse & { notes: PermanentNote[] }>;
  getPermanentNote(id: string): Promise<PermanentNote>;
  createPermanentNote(request: CreatePermanentNoteRequest): Promise<PermanentNote>;
  updatePermanentNote(request: UpdatePermanentNoteRequest): Promise<PermanentNote>;
  deletePermanentNote(id: string): Promise<void>;
}

/**
 * Implementation of NotesRepository
 * Converts service layer data to domain models
 */
export class NotesRepositoryImpl implements NotesRepository {
  // Quick Notes
  async listQuickNotes(contextId?: string): Promise<QuickNote[]> {
    const notes = await quickNotesService.list();
    const domainNotes = notes.map(QuickNote.fromData);
    
    if (contextId) {
      return domainNotes.filter(note => note.belongsToContext(contextId));
    }
    
    return domainNotes;
  }

  async getQuickNote(id: string): Promise<QuickNote> {
    const note = await quickNotesService.getById(id);
    return QuickNote.fromData(note);
  }

  async updateQuickNote(request: UpdateQuickNoteRequest): Promise<QuickNote> {
    const note = await quickNotesService.update(request);
    return QuickNote.fromData(note);
  }

  async deleteQuickNote(id: string): Promise<void> {
    await quickNotesService.delete(id);
  }

  async getQuickNotesStatus(): Promise<QuickNotesStatus> {
    return await quickNotesService.getStatus();
  }

  // Permanent Notes
  async listPermanentNotes(): Promise<PermanentNote[]> {
    const notes = await permanentNotesService.list();
    return notes.map(PermanentNote.fromData);
  }

  async searchPermanentNotes(query: string): Promise<SearchPermanentNotesResponse & { notes: PermanentNote[] }> {
    const result = await permanentNotesService.search(query);
    return {
      ...result,
      notes: result.notes.map(PermanentNote.fromData),
    };
  }

  async getPermanentNote(id: string): Promise<PermanentNote> {
    const note = await permanentNotesService.getById(id);
    return PermanentNote.fromData(note);
  }

  async createPermanentNote(request: CreatePermanentNoteRequest): Promise<PermanentNote> {
    const note = await permanentNotesService.create(request);
    return PermanentNote.fromData(note);
  }

  async updatePermanentNote(request: UpdatePermanentNoteRequest): Promise<PermanentNote> {
    const note = await permanentNotesService.update(request);
    return PermanentNote.fromData(note);
  }

  async deletePermanentNote(id: string): Promise<void> {
    await permanentNotesService.delete(id);
  }
}

// Export singleton instance
export const notesRepository: NotesRepository = new NotesRepositoryImpl();
