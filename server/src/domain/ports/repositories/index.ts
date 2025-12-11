import { DocumentEntity, DocumentChunkEntity, NoteEntity, RAGUsageEntity, QuickNoteEntity, ContextEntity, PermanentNoteEntity, ReviewSessionEntity } from '../../entities/index.js';

export interface DocumentsRepository {
  save(document: Omit<DocumentEntity, 'id' | 'createdAt'>): number;
  updateEmbeddingAndText(id: number, embedding: number[], text: string): void;
  delete(id: number): void;
  getById(id: number): DocumentEntity | null;
  list(): DocumentEntity[];
}

export interface DocumentChunksRepository {
  saveMany(documentId: number, chunks: Array<Omit<DocumentChunkEntity, 'id' | 'documentId'>>): void;
  getAll(): DocumentChunkEntity[];
  getByDocumentId(documentId: number): DocumentChunkEntity[];
}

export interface NotesRepository {
  save(note: NoteEntity): void;
  updateSrsFields(id: string, fields: Partial<Pick<NoteEntity, 'nextReview' | 'interval' | 'easiness' | 'repetitions' | 'lastReview' | 'lastPerformance'>>): void;
  list(): NoteEntity[];
  delete(id: string): void;
}

export interface UsageRepository {
  log(entry: Omit<RAGUsageEntity, 'id' | 'createdAt'>): number;
  forDocument(documentId: number): RAGUsageEntity[];
}

export interface QuickNotesRepository {
  save(note: QuickNoteEntity): void;
  update(id: string, note: Partial<Omit<QuickNoteEntity, 'id' | 'createdAt'>>): void;
  list(contextId?: string): QuickNoteEntity[];
  getById(id: string): QuickNoteEntity | null;
  delete(id: string): void;
  getByContext(contextId: string): QuickNoteEntity[];
}

export interface ContextRepository {
  save(context: ContextEntity): void;
  update(id: string, context: Partial<Omit<ContextEntity, 'id' | 'createdAt'>>): void;
  list(): ContextEntity[];
  getById(id: string): ContextEntity | null;
  getChildren(parentId: string): ContextEntity[];
  delete(id: string): void;
}

export interface PermanentNotesRepository {
  save(note: PermanentNoteEntity): void;
  update(id: string, note: Partial<Omit<PermanentNoteEntity, 'id' | 'createdAt'>>): void;
  list(): PermanentNoteEntity[];
  getById(id: string): PermanentNoteEntity | null;
  delete(id: string): void;
  search(query: string): PermanentNoteEntity[];
}

export interface ReviewSessionRepository {
  save(session: ReviewSessionEntity): void;
  update(id: string, session: Partial<Omit<ReviewSessionEntity, 'id' | 'startedAt'>>): void;
  list(): ReviewSessionEntity[];
  getById(id: string): ReviewSessionEntity | null;
  delete(id: string): void;
  getActiveSession(): ReviewSessionEntity | null;
}


