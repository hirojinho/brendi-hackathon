import DocumentDatabase from '../../db/documentDatabase.js';
import { DocumentsRepository } from '../../../domain/ports/repositories/index.js';
import { DocumentEntity } from '../../../domain/entities/index.js';

export class DocumentsRepositorySQLite implements DocumentsRepository {
  constructor(private readonly db: DocumentDatabase = new DocumentDatabase()) {}

  save(document: Omit<DocumentEntity, 'id' | 'createdAt'>): number {
    return this.db.saveDocument({
      title: document.title,
      originalname: document.originalname,
      embedding: document.embedding || [],
      text: document.text || ''
    });
  }

  updateEmbeddingAndText(id: number, embedding: number[], text: string): void {
    this.db.updateDocumentEmbeddingAndText(id, embedding, text);
  }

  delete(id: number): void {
    this.db.deleteDocument(id);
  }

  getById(id: number): DocumentEntity | null {
    const metaList = this.db.getAllDocuments();
    const meta = metaList.find(d => d.id === id);
    if (!meta) return null;
    const embText = this.db.getEmbeddingAndText(id);
    return {
      id,
      title: meta.title,
      originalname: meta.originalname,
      text: embText?.text || '',
      embedding: embText?.embedding || [],
      createdAt: meta.created_at
    };
  }

  list(): DocumentEntity[] {
    const docs = this.db.getAllDocuments();
    return docs.map(d => ({
      id: d.id,
      title: d.title,
      originalname: d.originalname,
      text: this.db.getEmbeddingAndText(d.id)?.text || '',
      embedding: this.db.getEmbeddingAndText(d.id)?.embedding || [],
      createdAt: d.created_at
    }));
  }
}


