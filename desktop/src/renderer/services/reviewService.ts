import type { 
  ReviewStatus, 
  ActiveReviewSessionData, 
  ProcessNoteRequest, 
  ProcessNoteResponse,
  ReviewSession 
} from '../types/review';

export class ReviewService {
  private baseUrl = 'http://localhost:3001/api/review';

  async getReviewStatus(): Promise<ReviewStatus> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get review status: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  }

  async createReviewSession(): Promise<ReviewSession> {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create review session: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.session;
  }

  async getActiveReviewSession(): Promise<ActiveReviewSessionData> {
    const response = await fetch(`${this.baseUrl}/session/active`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No active review session found');
      }
      throw new Error(`Failed to get active review session: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  }

  async processNoteInReview(
    sessionId: string, 
    noteId: string, 
    request: ProcessNoteRequest
  ): Promise<ProcessNoteResponse> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}/notes/${noteId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to process note: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data;
  }

  async completeReviewSession(sessionId: string): Promise<{ canCreateNewNotes: boolean }> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to complete review session: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data;
  }
}

export const reviewService = new ReviewService();