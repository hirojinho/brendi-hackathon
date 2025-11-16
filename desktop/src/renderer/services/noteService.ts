import type { ModelType } from '../types';

export interface CreateNoteRequest {
  content: string;
  model: ModelType;
  modelName?: string;
}

export interface CreateNoteResponse {
  notes: Array<{ id: string; title: string; content: string; tags: string[] }>;
}

export class NoteService {
  async createNote(request: CreateNoteRequest): Promise<CreateNoteResponse> {
    try {
      const result = await window.electronAPI.createNote(request);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to create note: ${error.message || 'Unknown error'}`);
    }
  }

  validateNoteContent(content: string): { isValid: boolean; error?: string } {
    if (content.length < 100) {
      return {
        isValid: false,
        error: 'Note content must be at least 100 characters. Current content may be too short.',
      };
    }
    return { isValid: true };
  }
}

export const noteService = new NoteService();

