export interface QuickNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  contextId: string | null;
  createdAt: string;
  lastModified: string;
  isReviewRequired: boolean;
}

export interface PermanentNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  sourceQuickNoteId?: string;
}

export interface ReviewSession {
  id: string;
  quickNoteIds: string[];
  startedAt: string;
  completedAt?: string;
  isComplete: boolean;
}

export interface ReviewStatus {
  isReviewRequired: boolean;
  canCreateNewNote: boolean;
  notesRequiringReview: QuickNote[];
  activeSession: ReviewSession | null;
  reviewCount: number;
}

export interface ActiveReviewSessionData {
  session: ReviewSession;
  notes: QuickNote[];
}

export interface ProcessNoteRequest {
  action: 'transform' | 'discard';
  permanentNoteData?: {
    title?: string;
    content?: string;
    tags?: string[];
  };
}

export interface ProcessNoteResponse {
  action: 'transform' | 'discard';
  result: PermanentNote | null;
  sessionComplete: boolean;
  session: ReviewSession | null;
}