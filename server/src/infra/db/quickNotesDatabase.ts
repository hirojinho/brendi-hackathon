import Database from 'better-sqlite3';
import { QuickNoteEntity } from '../../domain/entities/index.js';
import path from 'path';

export class QuickNotesDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'quick_notes.db');
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS quick_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        context_id TEXT,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      )
    `);
    
    // Add context_id column if it doesn't exist (for existing databases)
    try {
      this.db.prepare('ALTER TABLE quick_notes ADD COLUMN context_id TEXT').run();
    } catch (e) {
      // Column already exists, ignore
    }
  }

  getAllQuickNotes(contextId?: string): QuickNoteEntity[] {
    let query = 'SELECT * FROM quick_notes';
    const params: any[] = [];
    
    if (contextId) {
      query += ' WHERE context_id = ?';
      params.push(contextId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const notes = this.db.prepare(query).all(...params) as any[];
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: JSON.parse(note.tags),
      contextId: note.context_id || null,
      createdAt: note.created_at,
      lastModified: note.last_modified
    }));
  }

  getQuickNote(id: string): QuickNoteEntity | null {
    const note = this.db.prepare('SELECT * FROM quick_notes WHERE id = ?').get(id) as any;
    if (!note) return null;
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      tags: JSON.parse(note.tags),
      contextId: note.context_id || null,
      createdAt: note.created_at,
      lastModified: note.last_modified
    };
  }

  saveQuickNote(note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    contextId?: string | null;
    createdAt: Date;
    lastModified: Date;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO quick_notes (
        id, title, content, tags, context_id, created_at, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      note.id,
      note.title,
      note.content,
      JSON.stringify(note.tags),
      note.contextId || null,
      note.createdAt.toISOString(),
      note.lastModified.toISOString()
    );
  }

  deleteQuickNote(id: string): void {
    this.db.prepare('DELETE FROM quick_notes WHERE id = ?').run(id);
  }
}

export default QuickNotesDatabase;

