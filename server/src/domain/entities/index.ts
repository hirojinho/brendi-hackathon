export interface DocumentEntity {
  id: number;
  title: string;
  originalname: string;
  text: string;
  embedding: number[];
  createdAt: string;
}

export interface DocumentChunkEntity {
  id: number;
  documentId: number;
  chunkIndex: number;
  chunkText: string;
  embedding: number[];
}

export interface NoteEntity {
  id: string;
  title: string;
  content: string;
  tags: string[];
  relatedNotes: string[];
  createdAt: string;
  lastModified: string;
  conversationId: string;
  messageIndex: number;
  nextReview?: string | null;
  interval?: number | null;
  easiness?: number | null;
  repetitions?: number | null;
  lastReview?: string | null;
  lastPerformance?: number | null;
}

export interface RAGUsageEntity {
  id: number;
  documentId: number;
  chunkIndexes: number[];
  responseExcerpt: string;
  createdAt: string;
}

export interface ContextEntity {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
  lastModified: string;
}

export interface QuickNoteEntity {
  id: string;
  title: string;
  content: string;
  tags: string[];
  contextId: string | null;
  createdAt: string;
  lastModified: string;
  isReviewRequired: boolean;
}

export interface PermanentNoteEntity {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  sourceQuickNoteId?: string;
}

export interface ReviewSessionEntity {
  id: string;
  quickNoteIds: string[];
  startedAt: string;
  completedAt?: string;
  isComplete: boolean;
}


