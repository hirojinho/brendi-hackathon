import DocumentDatabase from '../../db/documentDatabase.js';
import { DocumentsRepository } from '../../../domain/ports/repositories/index.js';
import { DocumentEntity } from '../../../domain/entities/index.js';

export class DocumentsRepositorySQLite implements DocumentsRepository {
  constructor(private readonly documentDatabase: DocumentDatabase = new DocumentDatabase()) {}

  save(document: Omit<DocumentEntity, 'id' | 'createdAt'>): number {
    return this.documentDatabase.saveDocument({
      title: document.title,
      originalname: document.originalname,
      embedding: document.embedding || [],
      text: document.text || ''
    });
  }

  updateEmbeddingAndText(id: number, embedding: number[], text: string): void {
    this.documentDatabase.updateDocumentEmbeddingAndText(id, embedding, text);
  }

  delete(id: number): void {
    this.documentDatabase.deleteDocument(id);
  }

  getById(id: number): DocumentEntity | null {
    const metaList = this.documentDatabase.getAllDocuments();
    const meta = metaList.find(d => d.id === id);
    if (!meta) return null;
    const embText = this.documentDatabase.getEmbeddingAndText(id);
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
    const docs = this.documentDatabase.getAllDocuments();
    return docs.map(documentRow => ({
      id: documentRow.id,
      title: documentRow.title,
      originalname: documentRow.originalname,
      text: this.documentDatabase.getEmbeddingAndText(documentRow.id)?.text || '',
      embedding: this.documentDatabase.getEmbeddingAndText(documentRow.id)?.embedding || [],
      createdAt: documentRow.created_at
    }));
  }
}


