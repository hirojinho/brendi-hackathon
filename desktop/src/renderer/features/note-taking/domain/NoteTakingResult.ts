import type { ProcessNoteTakingInputResponse } from '../../../services/noteTakingAgentService';

/**
 * Domain model for Note-taking Agent Result
 */
export class NoteTakingResult {
  constructor(
    public readonly shouldCreateNote: boolean,
    public readonly contextId: string | null,
    public readonly suggestedContext: {
      name: string;
      description?: string;
      parentId?: string | null;
    } | null,
    public readonly reasoning: string,
    public readonly notes: Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
    }>,
    public readonly createdNoteIds: string[] = []
  ) {}

  /**
   * Check if result has notes
   */
  hasNotes(): boolean {
    return this.notes.length > 0;
  }

  /**
   * Check if result suggests creating a context
   */
  suggestsContext(): boolean {
    return !!this.suggestedContext;
  }

  /**
   * Get note count
   */
  getNoteCount(): number {
    return this.notes.length;
  }

  /**
   * Check if result indicates success
   */
  isSuccess(): boolean {
    return this.shouldCreateNote && this.hasNotes();
  }

  /**
   * Check if result indicates error
   */
  isError(): boolean {
    return this.reasoning.toLowerCase().includes('error');
  }

  /**
   * Create from API data
   */
  static fromData(data: ProcessNoteTakingInputResponse): NoteTakingResult {
    return new NoteTakingResult(
      data.shouldCreateNote,
      data.contextId ?? null,
      data.suggestedContext ?? null,
      data.reasoning,
      data.notes,
      data.createdNoteIds ?? []
    );
  }
}
