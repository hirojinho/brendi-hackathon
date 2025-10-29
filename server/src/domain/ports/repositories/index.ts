import { DocumentEntity, DocumentChunkEntity, NoteEntity, RAGUsageEntity } from '../../entities/index.js';

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


