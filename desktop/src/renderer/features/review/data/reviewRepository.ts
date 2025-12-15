import type {
  ReviewStatus,
  ActiveReviewSessionData,
  ProcessNoteRequest,
  ProcessNoteResponse,
  ReviewSession as ReviewSessionData,
  QuickNote,
} from '../../../types/review';
import { reviewService } from '../../../services/reviewService';
import { ReviewSession } from '../domain/ReviewSession';

/**
 * Repository interface for review data access
 * Abstracts data fetching and provides a clean API
 */
export interface ReviewRepository {
  getStatus(): Promise<ReviewStatus>;
  getActiveSession(): Promise<ReviewSession | null>;
  createSession(): Promise<ReviewSession>;
  processNote(
    sessionId: string,
    noteId: string,
    request: ProcessNoteRequest
  ): Promise<ProcessNoteResponse>;
  completeSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }>;
}

/**
 * Implementation of ReviewRepository
 * Wraps the service layer and converts data to domain models
 */
export class ReviewRepositoryImpl implements ReviewRepository {
  async getStatus(): Promise<ReviewStatus> {
    return await reviewService.getReviewStatus();
  }

  async getActiveSession(): Promise<ReviewSession | null> {
    const data = await reviewService.getActiveReviewSession();
    
    if (!data) {
      return null;
    }

    // Convert API data to domain model
    return ReviewSession.fromData(data.session, data.notes);
  }

  async createSession(): Promise<ReviewSession> {
    const sessionData = await reviewService.createReviewSession();
    
    // After creating, fetch the full session with notes
    const activeSession = await this.getActiveSession();
    
    if (!activeSession) {
      throw new Error('Failed to load created session');
    }

    return activeSession;
  }

  async processNote(
    sessionId: string,
    noteId: string,
    request: ProcessNoteRequest
  ): Promise<ProcessNoteResponse> {
    return await reviewService.processNoteInReview(sessionId, noteId, request);
  }

  async completeSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }> {
    return await reviewService.completeReviewSession(sessionId);
  }
}

// Export singleton instance
export const reviewRepository: ReviewRepository = new ReviewRepositoryImpl();
