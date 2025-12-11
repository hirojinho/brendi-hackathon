import Database from 'better-sqlite3';
import { QuickNoteEntity, PermanentNoteEntity, ReviewSessionEntity } from '../../domain/entities/index.js';
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
        is_review_required INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS permanent_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        tags TEXT NOT NULL,
        source_quick_note_id TEXT
      );

      CREATE TABLE IF NOT EXISTS review_sessions (
        id TEXT PRIMARY KEY,
        quick_note_ids TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        is_complete INTEGER NOT NULL DEFAULT 0
      )
    `);
    
    // Add context_id column if it doesn't exist (for existing databases)
    try {
      this.db.prepare('ALTER TABLE quick_notes ADD COLUMN context_id TEXT').run();
    } catch (e) {
      // Column already exists, ignore
    }

    // Add is_review_required column if it doesn't exist (for existing databases)
    try {
      this.db.prepare('ALTER TABLE quick_notes ADD COLUMN is_review_required INTEGER NOT NULL DEFAULT 0').run();
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
      lastModified: note.last_modified,
      isReviewRequired: Boolean(note.is_review_required)
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
      lastModified: note.last_modified,
      isReviewRequired: Boolean(note.is_review_required)
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
    isReviewRequired?: boolean;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO quick_notes (
        id, title, content, tags, context_id, created_at, last_modified, is_review_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      note.id,
      note.title,
      note.content,
      JSON.stringify(note.tags),
      note.contextId || null,
      note.createdAt.toISOString(),
      note.lastModified.toISOString(),
      note.isReviewRequired ? 1 : 0
    );
  }

  deleteQuickNote(id: string): void {
    this.db.prepare('DELETE FROM quick_notes WHERE id = ?').run(id);
  }

  // Permanent Notes methods
  getAllPermanentNotes(): PermanentNoteEntity[] {
    const notes = this.db.prepare('SELECT * FROM permanent_notes ORDER BY updated_at DESC').all() as any[];
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags),
      sourceQuickNoteId: note.source_quick_note_id || undefined
    }));
  }

  getPermanentNote(id: string): PermanentNoteEntity | null {
    const note = this.db.prepare('SELECT * FROM permanent_notes WHERE id = ?').get(id) as any;
    if (!note) return null;
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags),
      sourceQuickNoteId: note.source_quick_note_id || undefined
    };
  }

  savePermanentNote(note: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    sourceQuickNoteId?: string;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO permanent_notes (
        id, title, content, created_at, updated_at, tags, source_quick_note_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      note.id,
      note.title,
      note.content,
      note.createdAt.toISOString(),
      note.updatedAt.toISOString(),
      JSON.stringify(note.tags),
      note.sourceQuickNoteId || null
    );
  }

  deletePermanentNote(id: string): void {
    this.db.prepare('DELETE FROM permanent_notes WHERE id = ?').run(id);
  }

  searchPermanentNotes(query: string): PermanentNoteEntity[] {
    const searchTerm = `%${query}%`;
    const notes = this.db.prepare(`
      SELECT * FROM permanent_notes 
      WHERE title LIKE ? OR content LIKE ? 
      ORDER BY updated_at DESC
    `).all(searchTerm, searchTerm) as any[];
    
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      tags: JSON.parse(note.tags),
      sourceQuickNoteId: note.source_quick_note_id || undefined
    }));
  }

  // Review Session methods
  getAllReviewSessions(): ReviewSessionEntity[] {
    const sessions = this.db.prepare('SELECT * FROM review_sessions ORDER BY started_at DESC').all() as any[];
    return sessions.map(session => ({
      id: session.id,
      quickNoteIds: JSON.parse(session.quick_note_ids),
      startedAt: session.started_at,
      completedAt: session.completed_at || undefined,
      isComplete: Boolean(session.is_complete)
    }));
  }

  getReviewSession(id: string): ReviewSessionEntity | null {
    const session = this.db.prepare('SELECT * FROM review_sessions WHERE id = ?').get(id) as any;
    if (!session) return null;
    return {
      id: session.id,
      quickNoteIds: JSON.parse(session.quick_note_ids),
      startedAt: session.started_at,
      completedAt: session.completed_at || undefined,
      isComplete: Boolean(session.is_complete)
    };
  }

  saveReviewSession(session: {
    id: string;
    quickNoteIds: string[];
    startedAt: Date;
    completedAt?: Date;
    isComplete: boolean;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO review_sessions (
        id, quick_note_ids, started_at, completed_at, is_complete
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      session.id,
      JSON.stringify(session.quickNoteIds),
      session.startedAt.toISOString(),
      session.completedAt?.toISOString() || null,
      session.isComplete ? 1 : 0
    );
  }

  deleteReviewSession(id: string): void {
    this.db.prepare('DELETE FROM review_sessions WHERE id = ?').run(id);
  }

  getActiveReviewSession(): ReviewSessionEntity | null {
    const session = this.db.prepare('SELECT * FROM review_sessions WHERE is_complete = 0 ORDER BY started_at DESC LIMIT 1').get() as any;
    if (!session) return null;
    return {
      id: session.id,
      quickNoteIds: JSON.parse(session.quick_note_ids),
      startedAt: session.started_at,
      completedAt: session.completed_at || undefined,
      isComplete: Boolean(session.is_complete)
    };
  }
}

export default QuickNotesDatabase;

