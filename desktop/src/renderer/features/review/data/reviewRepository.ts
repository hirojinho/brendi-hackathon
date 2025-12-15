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
import { cacheManager } from '../../../shared/cache/Cache';

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
 * Implementation of ReviewRepository with caching
 * Wraps the service layer and converts data to domain models
 */
class ReviewRepositoryImpl implements ReviewRepository {
  private cache = cacheManager.getCache<any>('review', { ttl: 3000 }); // 3 second cache

  async getStatus(): Promise<ReviewStatus> {
    const cacheKey = 'review:status';
    const cached = this.cache.get<ReviewStatus>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const status = await reviewService.getReviewStatus();
    this.cache.set(cacheKey, status);
    return status;
  }

  async getActiveSession(): Promise<ReviewSession | null> {
    const cacheKey = 'review:active-session';
    const cached = this.cache.get<ReviewSession | null>(cacheKey);
    
    if (cached !== null) { // null is a valid value (no session)
      return cached;
    }

    const data = await reviewService.getActiveReviewSession();
    
    if (!data) {
      this.cache.set(cacheKey, null, 1000); // Cache "no session" for shorter time
      return null;
    }

    // Convert API data to domain model
    const session = ReviewSession.fromData(data.session, data.notes);
    this.cache.set(cacheKey, session);
    return session;
  }

  async createSession(): Promise<ReviewSession> {
    const sessionData = await reviewService.createReviewSession();
    
    // Invalidate caches
    this.cache.invalidatePattern('review:*');
    
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
    const result = await reviewService.processNoteInReview(sessionId, noteId, request);
    
    // Invalidate caches
    this.cache.invalidatePattern('review:*');
    
    return result;
  }

  async completeSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }> {
    const result = await reviewService.completeReviewSession(sessionId);
    
    // Invalidate all review caches
    this.cache.invalidatePattern('review:*');
    
    return result;
  }
}

// Export singleton instance
export const reviewRepository: ReviewRepository = new ReviewRepositoryImpl();
