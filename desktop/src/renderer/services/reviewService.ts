import type { 
  ReviewStatus, 
  ActiveReviewSessionData, 
  ProcessNoteRequest, 
  ProcessNoteResponse,
  ReviewSession 
} from '../types/review';

// Extend the existing global interface instead of overriding it
declare global {
  interface Window {
    electronAPI: {
      review: {
        getStatus: () => Promise<ReviewStatus>;
        createSession: () => Promise<{ session: ReviewSession }>;
        getActiveSession: () => Promise<ActiveReviewSessionData | null>;
        processNote: (payload: { sessionId: string; noteId: string; action: 'transform' | 'discard'; permanentNoteData?: any }) => Promise<ProcessNoteResponse>;
        completeSession: (sessionId: string) => Promise<{ canCreateNewNotes: boolean }>;
      };
      // Other methods are defined in preload.ts
      toggleOverlay: () => Promise<void>;
      openMainWindow: () => Promise<boolean>;
      [key: string]: any; // Allow other properties
    };
  }
}

export class ReviewService {
  async getReviewStatus(): Promise<ReviewStatus> {
    try {
      const result = await window.electronAPI.review.getStatus();
      return result;
    } catch (error) {
      console.error('Failed to get review status:', error);
      throw new Error(`Failed to get review status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createReviewSession(): Promise<ReviewSession> {
    try {
      const result = await window.electronAPI.review.createSession();
      return result.session;
    } catch (error) {
      console.error('Failed to create review session:', error);
      throw new Error(`Failed to create review session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getActiveReviewSession(): Promise<ActiveReviewSessionData | null> {
    try {
      const result = await window.electronAPI.review.getActiveSession();
      // If result is null, there's no active session (expected case)
      if (!result) {
        return null;
      }
      return result;
    } catch (error) {
      // Check if this is a "no session" case (expected) vs actual error
      if (error instanceof Error) {
        if (error.message.includes('404') || 
            error.message.includes('Active review session') ||
            error.message.includes('not found')) {
          // No active session - this is expected, return null
          return null;
        }
      }
      // Actual error - log and throw
      console.error('Failed to get active review session:', error);
      throw new Error(`Failed to get active review session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processNoteInReview(
    sessionId: string, 
    noteId: string, 
    request: ProcessNoteRequest
  ): Promise<ProcessNoteResponse> {
    try {
      const result = await window.electronAPI.review.processNote({
        sessionId,
        noteId,
        action: request.action,
        permanentNoteData: request.permanentNoteData
      });
      return result;
    } catch (error) {
      console.error('Failed to process note in review:', error);
      throw new Error(`Failed to process note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async completeReviewSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }> {
    try {
      const result = await window.electronAPI.review.completeSession(sessionId);
      return result;
    } catch (error) {
      console.error('Failed to complete review session:', error);
      throw new Error(`Failed to complete review session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const reviewService = new ReviewService();