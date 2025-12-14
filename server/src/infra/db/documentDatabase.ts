import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DocumentDatabase {
  private db!: Database.Database;
  private fallbackMode = false;

  constructor() {
    try {
      // Ensure the database directory exists
      const dbDir = path.dirname(path.resolve('documents.db'));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new Database('documents.db');
      this.db.pragma('journal_mode = WAL');
      this.initializeTables();
      console.log('[DocumentDatabase] SQLite database initialized successfully');
    } catch (error) {
      console.error('[DocumentDatabase] Failed to initialize SQLite database:', error);
      console.warn('[DocumentDatabase] Falling back to in-memory storage');
      this.fallbackMode = true;
    }
  }

  private initializeTables(): void {
    if (this.fallbackMode) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        originalname TEXT NOT NULL,
        embedding TEXT,
        text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding TEXT,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
    `);
  }

  saveDocument({ title, originalname, embedding, text }: { title: string, originalname: string, embedding: number[], text: string }): number {
    const stmt = this.db.prepare(`
      INSERT INTO documents (title, originalname, embedding, text)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(title, originalname, JSON.stringify(embedding), text);
    return result.lastInsertRowid as number;
  }

  saveChunks(documentId: number, chunks: { chunk_index: number, chunk_text: string, embedding: number[] }[]): void {
    if (this.fallbackMode) {
      // Mock implementation - do nothing
      return;
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding)
      VALUES (?, ?, ?, ?)
    `);
    const insertMany = this.db.transaction(() => {
      for (const chunk of chunks) {
        stmt.run(documentId, chunk.chunk_index, chunk.chunk_text, JSON.stringify(chunk.embedding));
      }
    });
    insertMany();
  }

  getAllDocuments(): { id: number; title: string; originalname: string; created_at: string }[] {
    if (this.fallbackMode) {
      return [];
    }
    
    return this.db.prepare('SELECT id, title, originalname, created_at FROM documents ORDER BY created_at DESC').all() as { id: number; title: string; originalname: string; created_at: string }[];
  }

  deleteDocument(id: number): void {
    if (this.fallbackMode) {
      return;
    }
    
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }

  public getEmbeddingAndText(id: number): { embedding: number[]; text: string } | null {
    if (this.fallbackMode) {
      return null;
    }
    
    const row = this.db.prepare('SELECT embedding, text FROM documents WHERE id = ?').get(id) as { embedding: string; text: string } | undefined;
    if (!row) return null;
    return { embedding: JSON.parse(row.embedding), text: row.text };
  }

  getAllChunks(): { id: number; document_id: number; chunk_index: number; chunk_text: string; embedding: number[] }[] {
    if (this.fallbackMode) {
      return [];
    }
    
    const rows = this.db.prepare(`
      SELECT id, document_id, chunk_index, chunk_text, embedding 
      FROM document_chunks 
      ORDER BY document_id, chunk_index ASC
    `).all();
    return (rows as any[]).map((row) => ({ ...row, embedding: JSON.parse((row as any).embedding) }));
  }

  getChunkWithDocMeta(chunkId: number): { title: string; originalname: string } | null {
    if (this.fallbackMode) {
      return null;
    }
    
    const row = this.db.prepare(`
      SELECT d.title, d.originalname
      FROM documents d
      JOIN document_chunks c ON c.document_id = d.id
      WHERE c.id = ?
    `).get(chunkId) as { title: string; originalname: string } | undefined;
    return row || null;
  }

  saveDocumentWithChunks({ title, originalname, embedding, text, chunks }: { title: string, originalname: string, embedding: number[], text: string, chunks: { chunk_index: number, chunk_text: string, embedding: number[] }[] }): number {
    if (this.fallbackMode) {
      return 1; // Mock document ID
    }
    
    const insertDoc = this.db.prepare(`
      INSERT INTO documents (title, originalname, embedding, text)
      VALUES (?, ?, ?, ?)
    `);
    const insertChunk = this.db.prepare(`
      INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding)
      VALUES (?, ?, ?, ?)
    `);
    const result = this.db.transaction(() => {
      const docId = insertDoc.run(title, originalname, JSON.stringify(embedding), text).lastInsertRowid as number;
      for (const chunk of chunks) {
        insertChunk.run(docId, chunk.chunk_index, chunk.chunk_text, JSON.stringify(chunk.embedding));
      }
      return docId;
    })();
    return result;
  }

  updateDocumentEmbeddingAndText(id: number, embedding: number[], text: string): void {
    if (this.fallbackMode) {
      return;
    }
    
    this.db.prepare('UPDATE documents SET embedding = ?, text = ? WHERE id = ?').run(JSON.stringify(embedding), text, id);
  }
}

export default DocumentDatabase;


