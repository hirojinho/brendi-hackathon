export interface QuickNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  contextId: string | null;
  createdAt: string;
  lastModified: string;
}

export interface UpdateQuickNoteRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  contextId?: string | null;
}

export interface QuickNotesStatus {
  currentCount: number;
  maxQuickNotes: number;
  canCreateNew: boolean;
  isReviewRequired: boolean;
  notesRequiringReviewCount: number;
  isAtLimit: boolean;
  remainingSlots: number;
}

export class QuickNotesService {
  async list(): Promise<QuickNote[]> {
    try {
      const result = await window.electronAPI.listQuickNotes();
      return result.notes.map((note: any) => ({
        ...note,
        contextId: note.contextId || null
      }));
    } catch (error: any) {
      throw new Error(`Failed to list quick notes: ${error.message || 'Unknown error'}`);
    }
  }

  async getById(id: string): Promise<QuickNote> {
    try {
      const result = await window.electronAPI.getQuickNote(id);
      return {
        ...result.note,
        contextId: (result.note as any).contextId || null
      };
    } catch (error: any) {
      throw new Error(`Failed to get quick note: ${error.message || 'Unknown error'}`);
    }
  }

  async update(request: UpdateQuickNoteRequest): Promise<QuickNote> {
    try {
      const result = await window.electronAPI.updateQuickNote(request);
      return {
        ...result.note,
        contextId: (result.note as any).contextId || null
      };
    } catch (error: any) {
      throw new Error(`Failed to update quick note: ${error.message || 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await window.electronAPI.deleteQuickNote(id);
    } catch (error: any) {
      throw new Error(`Failed to delete quick note: ${error.message || 'Unknown error'}`);
    }
  }

  async getStatus(): Promise<QuickNotesStatus> {
    try {
      const result = await window.electronAPI.getQuickNotesStatus();
      return result.status;
    } catch (error: any) {
      throw new Error(`Failed to get quick notes status: ${error.message || 'Unknown error'}`);
    }
  }
}

export const quickNotesService = new QuickNotesService();

