import type { QuickNote, ReviewSession as ReviewSessionData } from '../../../types/review';

/**
 * Domain model for Review Session
 * Encapsulates business logic for review session management
 */
export class ReviewSession {
  constructor(
    public readonly id: string,
    private readonly notes: QuickNote[],
    public readonly startedAt: Date,
    public readonly completedAt: Date | null = null,
    public readonly isComplete: boolean = false
  ) {}

  /**
   * Get the current note being reviewed (first in queue)
   */
  get currentNote(): QuickNote | null {
    return this.notes[0] ?? null;
  }

  /**
   * Get remaining notes count
   */
  get remainingCount(): number {
    return this.notes.length;
  }

  /**
   * Get total notes count (for progress calculation)
   */
  get totalCount(): number {
    return this.notes.length;
  }

  /**
   * Get progress percentage (0-100)
   * Note: This is calculated based on remaining notes, not processed ones
   */
  get progress(): number {
    if (this.totalCount === 0) return 100;
    return Math.round(((this.totalCount - this.remainingCount) / this.totalCount) * 100);
  }

  /**
   * Get current note index (1-based for display)
   */
  get currentNoteIndex(): number {
    return this.totalCount - this.remainingCount + 1;
  }

  /**
   * Check if session has notes
   */
  hasNotes(): boolean {
    return this.notes.length > 0;
  }

  /**
   * Check if session is empty
   */
  isEmpty(): boolean {
    return this.notes.length === 0;
  }

  /**
   * Process a note (remove it from the queue)
   * Returns a new ReviewSession instance (immutable)
   */
  processNote(noteId: string): ReviewSession {
    const updatedNotes = this.notes.filter(note => note.id !== noteId);
    const willBeComplete = updatedNotes.length === 0;

    return new ReviewSession(
      this.id,
      updatedNotes,
      this.startedAt,
      willBeComplete ? new Date() : this.completedAt,
      willBeComplete
    );
  }

  /**
   * Mark session as complete
   * Returns a new ReviewSession instance (immutable)
   */
  complete(): ReviewSession {
    return new ReviewSession(
      this.id,
      this.notes,
      this.startedAt,
      new Date(),
      true
    );
  }

  /**
   * Get all notes in the session
   */
  getNotes(): readonly QuickNote[] {
    return [...this.notes]; // Return copy to prevent mutation
  }

  /**
   * Find a note by ID
   */
  findNote(noteId: string): QuickNote | null {
    return this.notes.find(note => note.id === noteId) ?? null;
  }

  /**
   * Check if a note is in the session
   */
  containsNote(noteId: string): boolean {
    return this.notes.some(note => note.id === noteId);
  }

  /**
   * Create from API data
   */
  static fromData(
    sessionData: ReviewSessionData,
    notes: QuickNote[]
  ): ReviewSession {
    return new ReviewSession(
      sessionData.id,
      notes,
      new Date(sessionData.startedAt),
      sessionData.completedAt ? new Date(sessionData.completedAt) : null,
      sessionData.isComplete
    );
  }

  /**
   * Convert to API data format
   */
  toData(): ReviewSessionData {
    return {
      id: this.id,
      quickNoteIds: this.notes.map(note => note.id),
      startedAt: this.startedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      isComplete: this.isComplete
    };
  }
}
