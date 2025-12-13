import { QuickNotesRepository, ReviewSessionRepository } from '../../domain/ports/repositories/index.js';
import { QuickNoteEntity, ReviewSessionEntity } from '../../domain/entities/index.js';
import { randomUUID } from 'crypto';

export interface ReviewEngineConfig {
  reviewAgeThresholdHours: number;
  maxQuickNotes: number;
}

export class ReviewEngine {
  constructor(
    private readonly quickNotesRepo: QuickNotesRepository,
    private readonly reviewSessionRepo: ReviewSessionRepository,
    private readonly config: ReviewEngineConfig = {
      reviewAgeThresholdHours: 24,
      maxQuickNotes: 10
    }
  ) {}

  /**
   * Check if review is required based on note ages OR note limit
   */
  isReviewRequired(): boolean {
    const quickNotes = this.quickNotesRepo.list();
    
    // Review is required if at or over the note limit
    if (quickNotes.length >= this.config.maxQuickNotes) {
      return true;
    }

    // Review is also required if any notes are older than threshold
    const now = new Date();
    const thresholdMs = this.config.reviewAgeThresholdHours * 60 * 60 * 1000;

    return quickNotes.some(note => {
      const noteAge = now.getTime() - new Date(note.createdAt).getTime();
      return noteAge >= thresholdMs;
    });
  }

  /**
   * Check if new quick notes can be created
   */
  canCreateNewQuickNote(): boolean {
    // Cannot create if review is required
    if (this.isReviewRequired()) {
      return false;
    }

    // Cannot create if at note limit
    const quickNotes = this.quickNotesRepo.list();
    if (quickNotes.length >= this.config.maxQuickNotes) {
      return false;
    }

    return true;
  }

  /**
   * Get notes that require review (older than threshold OR when at note limit)
   */
  getNotesRequiringReview(): QuickNoteEntity[] {
    const quickNotes = this.quickNotesRepo.list();
    const now = new Date();
    const thresholdMs = this.config.reviewAgeThresholdHours * 60 * 60 * 1000;

    // If we're at or over the note limit, include oldest notes for review
    // even if they haven't reached the age threshold
    const isAtLimit = quickNotes.length >= this.config.maxQuickNotes;

    if (isAtLimit) {
      // Return all notes sorted by age (oldest first) when at limit
      return quickNotes
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Normal case: only notes older than threshold
    return quickNotes
      .filter(note => {
        const noteAge = now.getTime() - new Date(note.createdAt).getTime();
        return noteAge >= thresholdMs;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Create a new review session
   */
  createReviewSession(): ReviewSessionEntity {
    const notesToReview = this.getNotesRequiringReview();
    const session: ReviewSessionEntity = {
      id: randomUUID(),
      quickNoteIds: notesToReview.map(note => note.id),
      startedAt: new Date().toISOString(),
      isComplete: false
    };

    this.reviewSessionRepo.save(session);
    return session;
  }

  /**
   * Complete a review session
   */
  completeReviewSession(sessionId: string): void {
    const session = this.reviewSessionRepo.getById(sessionId);
    if (!session) {
      throw new Error(`Review session ${sessionId} not found`);
    }

    const updatedSession: ReviewSessionEntity = {
      ...session,
      completedAt: new Date().toISOString(),
      isComplete: true
    };

    this.reviewSessionRepo.update(sessionId, {
      completedAt: updatedSession.completedAt,
      isComplete: true
    });
  }

  /**
   * Get the current active review session
   */
  getActiveReviewSession(): ReviewSessionEntity | null {
    return this.reviewSessionRepo.getActiveSession();
  }

  /**
   * Process a note in review (either transform to permanent or discard)
   */
  processNoteInReview(sessionId: string, noteId: string): void {
    const session = this.reviewSessionRepo.getById(sessionId);
    if (!session) {
      throw new Error(`Review session ${sessionId} not found`);
    }

    // Remove the note from the session's quick note IDs
    const updatedQuickNoteIds = session.quickNoteIds.filter(id => id !== noteId);
    
    this.reviewSessionRepo.update(sessionId, {
      quickNoteIds: updatedQuickNoteIds
    });

    // If all notes are processed, mark session as complete
    if (updatedQuickNoteIds.length === 0) {
      this.completeReviewSession(sessionId);
    }
  }
}