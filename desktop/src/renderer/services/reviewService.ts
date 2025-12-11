import type { 
  ReviewStatus, 
  ActiveReviewSessionData, 
  ProcessNoteRequest, 
  ProcessNoteResponse,
  ReviewSession 
} from '../types/review';

declare global {
  interface Window {
    electronAPI: {
      review: {
        getStatus: () => Promise<{ data: ReviewStatus }>;
        createSession: () => Promise<{ data: { session: ReviewSession } }>;
        getActiveSession: () => Promise<{ data: ActiveReviewSessionData }>;
        processNote: (payload: { sessionId: string; noteId: string; action: 'transform' | 'discard'; permanentNoteData?: any }) => Promise<{ data: ProcessNoteResponse }>;
        completeSession: (sessionId: string) => Promise<{ data: { canCreateNewNotes: boolean } }>;
      };
    };
  }
}

export class ReviewService {
  async getReviewStatus(): Promise<ReviewStatus> {
    try {
      const result = await window.electronAPI.review.getStatus();
      return result.data;
    } catch (error) {
      console.error('Failed to get review status:', error);
      throw new Error(`Failed to get review status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createReviewSession(): Promise<ReviewSession> {
    try {
      const result = await window.electronAPI.review.createSession();
      return result.data.session;
    } catch (error) {
      console.error('Failed to create review session:', error);
      throw new Error(`Failed to create review session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getActiveReviewSession(): Promise<ActiveReviewSessionData> {
    try {
      const result = await window.electronAPI.review.getActiveSession();
      return result.data;
    } catch (error) {
      console.error('Failed to get active review session:', error);
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error('No active review session found');
      }
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
      return result.data;
    } catch (error) {
      console.error('Failed to process note in review:', error);
      throw new Error(`Failed to process note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async completeReviewSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }> {
    try {
      const result = await window.electronAPI.review.completeSession(sessionId);
      return result.data;
    } catch (error) {
      console.error('Failed to complete review session:', error);
      throw new Error(`Failed to complete review session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const reviewService = new ReviewService();