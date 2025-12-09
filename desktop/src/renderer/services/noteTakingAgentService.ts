import type { ModelType } from '../types';

export interface ProcessNoteTakingInputRequest {
  input: string;
  model: ModelType;
  modelName?: string;
  currentContextId?: string;
}

export interface ProcessNoteTakingInputResponse {
  shouldCreateNote: boolean;
  contextId?: string | null;
  suggestedContext?: { 
    name: string; 
    description?: string; 
    parentId?: string | null;
  } | null;
  reasoning: string;
  notes: Array<{ id: string; title: string; content: string; tags: string[] }>;
  createdNoteIds?: string[];
}

export class NoteTakingAgentService {
  async processInput(request: ProcessNoteTakingInputRequest): Promise<ProcessNoteTakingInputResponse> {
    try {
      const result = await window.electronAPI.processNoteTakingInput(request);
      return result;
    } catch (error: any) {
      throw new Error(`Failed to process note-taking input: ${error.message || 'Unknown error'}`);
    }
  }
}

export const noteTakingAgentService = new NoteTakingAgentService();

