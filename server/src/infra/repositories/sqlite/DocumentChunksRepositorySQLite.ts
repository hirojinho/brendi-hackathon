import DocumentDatabase from '../../db/documentDatabase.js';
import { DocumentChunksRepository } from '../../../domain/ports/repositories/index.js';
import { DocumentChunkEntity } from '../../../domain/entities/index.js';

export class DocumentChunksRepositorySQLite implements DocumentChunksRepository {
  constructor(private readonly db: DocumentDatabase = new DocumentDatabase()) {}

  saveMany(documentId: number, chunks: Array<Omit<DocumentChunkEntity, 'id' | 'documentId'>>): void {
    const payload = chunks.map(c => ({
      chunk_index: c.chunkIndex,
      chunk_text: c.chunkText,
      embedding: c.embedding
    }));
    this.db.saveChunks(documentId, payload);
  }

  getAll(): DocumentChunkEntity[] {
    return this.db.getAllChunks().map((c: any) => ({
      id: c.id,
      documentId: c.document_id,
      chunkIndex: c.chunk_index,
      chunkText: c.chunk_text,
      embedding: c.embedding
    }));
  }

  getByDocumentId(documentId: number): DocumentChunkEntity[] {
    // Not available directly; filter from all for now (small scale)
    return this.getAll().filter(c => c.documentId === documentId);
  }
}


