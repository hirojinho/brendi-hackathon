import { ReviewSessionRepository } from '../../../domain/ports/repositories/index.js';
import { ReviewSessionEntity } from '../../../domain/entities/index.js';
import QuickNotesDatabase from '../../db/quickNotesDatabase.js';

export class ReviewSessionRepositorySQLite implements ReviewSessionRepository {
  constructor(private readonly quickNotesDatabase: QuickNotesDatabase = new QuickNotesDatabase()) {}

  save(session: ReviewSessionEntity): void {
    this.quickNotesDatabase.saveReviewSession({
      id: session.id,
      quickNoteIds: session.quickNoteIds,
      startedAt: new Date(session.startedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
      isComplete: session.isComplete
    });
  }

  update(id: string, update: Partial<Omit<ReviewSessionEntity, 'id' | 'startedAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: ReviewSessionEntity = {
      ...existing,
      ...update
    };
    this.save(updated);
  }

  list(): ReviewSessionEntity[] {
    return this.quickNotesDatabase.getAllReviewSessions();
  }

  getById(id: string): ReviewSessionEntity | null {
    return this.quickNotesDatabase.getReviewSession(id);
  }

  delete(id: string): void {
    this.quickNotesDatabase.deleteReviewSession(id);
  }

  getActiveSession(): ReviewSessionEntity | null {
    return this.quickNotesDatabase.getActiveReviewSession();
  }
}