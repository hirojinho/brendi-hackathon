import DocumentDatabase from '../../db/documentDatabase.js';
import { DocumentChunksRepository } from '../../../domain/ports/repositories/index.js';
import { DocumentChunkEntity } from '../../../domain/entities/index.js';

export class DocumentChunksRepositorySQLite implements DocumentChunksRepository {
  constructor(private readonly documentDatabase: DocumentDatabase = new DocumentDatabase()) {}

  saveMany(documentId: number, chunks: Array<Omit<DocumentChunkEntity, 'id' | 'documentId'>>): void {
    const payload = chunks.map(c => ({
      chunk_index: c.chunkIndex,
      chunk_text: c.chunkText,
      embedding: c.embedding
    }));
    this.documentDatabase.saveChunks(documentId, payload);
  }

  getAll(): DocumentChunkEntity[] {
    return this.documentDatabase.getAllChunks().map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      chunkText: row.chunk_text,
      embedding: row.embedding
    }));
  }

  getByDocumentId(documentId: number): DocumentChunkEntity[] {
    // Not available directly; filter from all for now (small scale)
    return this.getAll().filter(c => c.documentId === documentId);
  }
}


