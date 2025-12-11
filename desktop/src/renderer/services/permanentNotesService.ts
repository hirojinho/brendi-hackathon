export interface PermanentNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  sourceQuickNoteId?: string;
}

export interface CreatePermanentNoteRequest {
  title: string;
  content: string;
  tags?: string[];
  sourceQuickNoteId?: string;
}

export interface UpdatePermanentNoteRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export interface SearchPermanentNotesResponse {
  notes: PermanentNote[];
  query: string;
  count: number;
}

export class PermanentNotesService {
  async list(): Promise<PermanentNote[]> {
    try {
      const result = await window.electronAPI.listPermanentNotes();
      return result.notes;
    } catch (error: any) {
      throw new Error(`Failed to list permanent notes: ${error.message || 'Unknown error'}`);
    }
  }

  async search(query: string): Promise<SearchPermanentNotesResponse> {
    try {
      const result = await window.electronAPI.searchPermanentNotes(query);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to search permanent notes: ${error.message || 'Unknown error'}`);
    }
  }

  async getById(id: string): Promise<PermanentNote> {
    try {
      const result = await window.electronAPI.getPermanentNote(id);
      return result.note;
    } catch (error: any) {
      throw new Error(`Failed to get permanent note: ${error.message || 'Unknown error'}`);
    }
  }

  async create(request: CreatePermanentNoteRequest): Promise<PermanentNote> {
    try {
      const result = await window.electronAPI.createPermanentNote(request);
      return result.note;
    } catch (error: any) {
      throw new Error(`Failed to create permanent note: ${error.message || 'Unknown error'}`);
    }
  }

  async update(request: UpdatePermanentNoteRequest): Promise<PermanentNote> {
    try {
      const result = await window.electronAPI.updatePermanentNote(request);
      return result.note;
    } catch (error: any) {
      throw new Error(`Failed to update permanent note: ${error.message || 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await window.electronAPI.deletePermanentNote(id);
    } catch (error: any) {
      throw new Error(`Failed to delete permanent note: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Highlight search terms in text for display
   * Requirements: 5.3
   */
  highlightSearchTerms(text: string, query: string): string {
    if (!query || query.trim().length === 0) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Format a permanent note for display
   * Requirements: 5.4
   */
  formatNoteForDisplay(note: PermanentNote): string {
    const formattedDate = new Date(note.createdAt).toLocaleDateString();
    const formattedTags = note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : '';
    
    let result = `Title: ${note.title}\nCreated: ${formattedDate}`;
    if (formattedTags) {
      result += `\n${formattedTags}`;
    }
    result += `\n\n${note.content}`;
    
    return result;
  }
}

export const permanentNotesService = new PermanentNotesService();