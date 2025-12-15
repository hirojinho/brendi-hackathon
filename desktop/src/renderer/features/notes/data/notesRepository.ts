import { quickNotesService, type QuickNote as QuickNoteData, type UpdateQuickNoteRequest, type QuickNotesStatus } from '../../../services/quickNotesService';
import { permanentNotesService, type PermanentNote as PermanentNoteData, type CreatePermanentNoteRequest, type UpdatePermanentNoteRequest, type SearchPermanentNotesResponse } from '../../../services/permanentNotesService';
import { QuickNote } from '../domain/QuickNote';
import { PermanentNote } from '../domain/PermanentNote';
import { cacheManager } from '../../../shared/cache/Cache';

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
 * Implementation of NotesRepository with caching
 * Converts service layer data to domain models and caches results
 */
class NotesRepositoryImpl implements NotesRepository {
  private cache = cacheManager.getCache<any>('notes', { ttl: 5000 }); // 5 second cache

  // Quick Notes
  async listQuickNotes(contextId?: string): Promise<QuickNote[]> {
    const cacheKey = `quick-notes:list:${contextId || 'all'}`;
    const cached = this.cache.get<QuickNote[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const notes = await quickNotesService.list();
    const domainNotes = notes.map(QuickNote.fromData);
    
    let result = domainNotes;
    if (contextId) {
      result = domainNotes.filter(note => note.belongsToContext(contextId));
    }
    
    this.cache.set(cacheKey, result);
    return result;
  }

  async getQuickNote(id: string): Promise<QuickNote> {
    const cacheKey = `quick-note:${id}`;
    const cached = this.cache.get<QuickNote>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const note = await quickNotesService.getById(id);
    const domainNote = QuickNote.fromData(note);
    
    this.cache.set(cacheKey, domainNote);
    return domainNote;
  }

  async updateQuickNote(request: UpdateQuickNoteRequest): Promise<QuickNote> {
    const note = await quickNotesService.update(request);
    const domainNote = QuickNote.fromData(note);
    
    // Invalidate caches
    this.cache.delete(`quick-note:${request.id}`);
    this.cache.invalidatePattern('quick-notes:list:*');
    this.cache.invalidatePattern('quick-notes:status');
    
    return domainNote;
  }

  async deleteQuickNote(id: string): Promise<void> {
    await quickNotesService.delete(id);
    
    // Invalidate caches
    this.cache.delete(`quick-note:${id}`);
    this.cache.invalidatePattern('quick-notes:list:*');
    this.cache.invalidatePattern('quick-notes:status');
  }

  async getQuickNotesStatus(): Promise<QuickNotesStatus> {
    const cacheKey = 'quick-notes:status';
    const cached = this.cache.get<QuickNotesStatus>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const status = await quickNotesService.getStatus();
    this.cache.set(cacheKey, status);
    return status;
  }

  // Permanent Notes
  async listPermanentNotes(): Promise<PermanentNote[]> {
    const cacheKey = 'permanent-notes:list';
    const cached = this.cache.get<PermanentNote[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const notes = await permanentNotesService.list();
    const domainNotes = notes.map(PermanentNote.fromData);
    
    this.cache.set(cacheKey, domainNotes);
    return domainNotes;
  }

  async searchPermanentNotes(query: string): Promise<SearchPermanentNotesResponse & { notes: PermanentNote[] }> {
    // Don't cache search results - they're query-specific and should be fresh
    const result = await permanentNotesService.search(query);
    return {
      ...result,
      notes: result.notes.map(PermanentNote.fromData),
    };
  }

  async getPermanentNote(id: string): Promise<PermanentNote> {
    const cacheKey = `permanent-note:${id}`;
    const cached = this.cache.get<PermanentNote>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const note = await permanentNotesService.getById(id);
    const domainNote = PermanentNote.fromData(note);
    
    this.cache.set(cacheKey, domainNote);
    return domainNote;
  }

  async createPermanentNote(request: CreatePermanentNoteRequest): Promise<PermanentNote> {
    const note = await permanentNotesService.create(request);
    const domainNote = PermanentNote.fromData(note);
    
    // Invalidate caches
    this.cache.invalidatePattern('permanent-notes:list');
    this.cache.invalidatePattern('permanent-notes:search:*');
    
    return domainNote;
  }

  async updatePermanentNote(request: UpdatePermanentNoteRequest): Promise<PermanentNote> {
    const note = await permanentNotesService.update(request);
    const domainNote = PermanentNote.fromData(note);
    
    // Invalidate caches
    this.cache.delete(`permanent-note:${request.id}`);
    this.cache.invalidatePattern('permanent-notes:list');
    this.cache.invalidatePattern('permanent-notes:search:*');
    
    return domainNote;
  }

  async deletePermanentNote(id: string): Promise<void> {
    await permanentNotesService.delete(id);
    
    // Invalidate caches
    this.cache.delete(`permanent-note:${id}`);
    this.cache.invalidatePattern('permanent-notes:list');
    this.cache.invalidatePattern('permanent-notes:search:*');
  }
}

// Export singleton instance
export const notesRepository: NotesRepository = new NotesRepositoryImpl();
