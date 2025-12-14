import Database from 'better-sqlite3';
import { QuickNoteEntity, PermanentNoteEntity, ReviewSessionEntity } from '../../domain/entities/index.js';
import path from 'path';
import fs from 'fs';

export class QuickNotesDatabase {
  private db!: Database.Database;
  private fallbackMode = false;
  private memoryStore: {
    quickNotes: any[];
    permanentNotes: any[];
    reviewSessions: any[];
  } = {
    quickNotes: [],
    permanentNotes: [],
    reviewSessions: []
  };

  constructor() {
    try {
      // Ensure the database directory exists
      const dbDir = path.dirname(path.resolve('quick_notes.db'));
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Initialize SQLite database
      this.db = new Database('quick_notes.db');
      this.db.pragma('journal_mode = WAL');
      this.initializeTables();
      console.log('[QuickNotesDatabase] SQLite database initialized successfully');
      
      // Add sample data if database is empty
      const noteCount = this.db.prepare('SELECT COUNT(*) as count FROM quick_notes').get() as { count: number };
      if (noteCount.count === 0) {
        this.initializeSampleData();
      }
    } catch (error) {
      console.error('[QuickNotesDatabase] Failed to initialize SQLite database:', error);
      console.warn('[QuickNotesDatabase] Falling back to in-memory storage');
      this.fallbackMode = true;
      this.initializeSampleData();
    }
  }

  private initializeSampleData() {
    // Add some sample quick notes for demonstration
    const sampleQuickNotes = [
      {
        id: 'quick-1',
        title: 'Welcome to Your Notes System',
        content: 'This is your new notes management system! You can create, edit, and organize your notes here. The system supports both quick notes for rapid capture and permanent notes for long-term storage.',
        tags: ['welcome', 'getting-started'],
        context_id: null,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        last_modified: new Date(Date.now() - 86400000).toISOString(),
        is_review_required: 0
      },
      {
        id: 'quick-2',
        title: 'Project Ideas',
        content: 'Some ideas for future projects:\n- Build a personal knowledge management system\n- Create a habit tracking app\n- Develop a reading list organizer\n- Design a simple task manager',
        tags: ['projects', 'ideas', 'brainstorming'],
        context_id: null,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        last_modified: new Date(Date.now() - 3600000).toISOString(),
        is_review_required: 1
      },
      {
        id: 'quick-3',
        title: 'Meeting Notes - Team Sync',
        content: 'Key points from today\'s team meeting:\n- Q4 goals discussion\n- New feature prioritization\n- Resource allocation for next sprint\n- Action items: Review design docs, Update project timeline',
        tags: ['meeting', 'team', 'work'],
        context_id: null,
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        last_modified: new Date(Date.now() - 7200000).toISOString(),
        is_review_required: 1
      }
    ];

    const samplePermanentNotes = [
      {
        id: 'perm-1',
        title: 'Effective Note-Taking Strategies',
        content: 'Research-backed strategies for effective note-taking:\n\n1. **Active Listening**: Focus on understanding rather than transcribing\n2. **Cornell Method**: Divide notes into sections for cues, notes, and summary\n3. **Mind Mapping**: Visual representation of information and connections\n4. **Spaced Repetition**: Review notes at increasing intervals\n5. **Synthesis**: Connect new information with existing knowledge\n\nRegular review and organization of notes significantly improves retention and understanding.',
        tags: ['productivity', 'learning', 'research'],
        created_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
        updated_at: new Date(Date.now() - 604800000).toISOString(),
        source_quick_note_id: null
      }
    ];

    if (this.fallbackMode) {
      this.memoryStore.quickNotes = sampleQuickNotes;
      this.memoryStore.permanentNotes = samplePermanentNotes;
    } else {
      // Insert sample data into SQLite database
      
      const insertQuickNote = this.db.prepare(`
        INSERT OR IGNORE INTO quick_notes (
          id, title, content, tags, context_id, created_at, last_modified, is_review_required
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertPermanentNote = this.db.prepare(`
        INSERT OR IGNORE INTO permanent_notes (
          id, title, content, created_at, updated_at, tags, source_quick_note_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const note of sampleQuickNotes) {
        insertQuickNote.run(
          note.id,
          note.title,
          note.content,
          JSON.stringify(note.tags),
          note.context_id,
          note.created_at,
          note.last_modified,
          note.is_review_required
        );
      }

      for (const note of samplePermanentNotes) {
        insertPermanentNote.run(
          note.id,
          note.title,
          note.content,
          note.created_at,
          note.updated_at,
          JSON.stringify(note.tags),
          note.source_quick_note_id
        );
      }

      console.log('[QuickNotesDatabase] Sample data inserted successfully');
    }
  }

  private initializeTables(): void {
    if (this.fallbackMode) return;
    
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
    if (this.fallbackMode) {
      // Use in-memory fallback
      let notes = this.memoryStore.quickNotes;
      if (contextId) {
        notes = notes.filter(note => note.context_id === contextId);
      }
      return notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        contextId: note.context_id || null,
        createdAt: note.created_at,
        lastModified: note.last_modified,
        isReviewRequired: Boolean(note.is_review_required)
      }));
    }
    
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
    if (this.fallbackMode) {
      const note = this.memoryStore.quickNotes.find(n => n.id === id);
      if (!note) return null;
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        contextId: note.context_id || null,
        createdAt: note.created_at,
        lastModified: note.last_modified,
        isReviewRequired: Boolean(note.is_review_required)
      };
    }
    
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
    if (this.fallbackMode) {
      // Use in-memory fallback
      const existingIndex = this.memoryStore.quickNotes.findIndex(n => n.id === note.id);
      const noteData = {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        context_id: note.contextId || null,
        created_at: note.createdAt.toISOString(),
        last_modified: note.lastModified.toISOString(),
        is_review_required: note.isReviewRequired ? 1 : 0
      };
      
      if (existingIndex >= 0) {
        this.memoryStore.quickNotes[existingIndex] = noteData;
      } else {
        this.memoryStore.quickNotes.push(noteData);
      }
      return;
    }
    
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
    if (this.fallbackMode) {
      this.memoryStore.quickNotes = this.memoryStore.quickNotes.filter(n => n.id !== id);
      return;
    }
    this.db.prepare('DELETE FROM quick_notes WHERE id = ?').run(id);
  }

  // Permanent Notes methods
  getAllPermanentNotes(): PermanentNoteEntity[] {
    if (this.fallbackMode) {
      return this.memoryStore.permanentNotes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        tags: note.tags,
        sourceQuickNoteId: note.source_quick_note_id || undefined
      }));
    }

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
    if (this.fallbackMode) {
      const note = this.memoryStore.permanentNotes.find(n => n.id === id);
      if (!note) return null;
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        tags: note.tags,
        sourceQuickNoteId: note.source_quick_note_id || undefined
      };
    }

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
    if (this.fallbackMode) {
      const existingIndex = this.memoryStore.permanentNotes.findIndex(n => n.id === note.id);
      const noteData = {
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.createdAt.toISOString(),
        updated_at: note.updatedAt.toISOString(),
        tags: note.tags,
        source_quick_note_id: note.sourceQuickNoteId || null
      };
      
      if (existingIndex >= 0) {
        this.memoryStore.permanentNotes[existingIndex] = noteData;
      } else {
        this.memoryStore.permanentNotes.push(noteData);
      }
      return;
    }

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
    if (this.fallbackMode) {
      this.memoryStore.permanentNotes = this.memoryStore.permanentNotes.filter(n => n.id !== id);
      return;
    }
    this.db.prepare('DELETE FROM permanent_notes WHERE id = ?').run(id);
  }

  searchPermanentNotes(query: string): PermanentNoteEntity[] {
    if (this.fallbackMode) {
      const searchTerm = query.toLowerCase();
      const notes = this.memoryStore.permanentNotes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) || 
        note.content.toLowerCase().includes(searchTerm)
      );
      return notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        tags: note.tags,
        sourceQuickNoteId: note.source_quick_note_id || undefined
      }));
    }

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
    if (this.fallbackMode) {
      return this.memoryStore.reviewSessions.map(session => ({
        id: session.id,
        quickNoteIds: session.quick_note_ids,
        startedAt: session.started_at,
        completedAt: session.completed_at || undefined,
        isComplete: Boolean(session.is_complete)
      }));
    }

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
    if (this.fallbackMode) {
      const session = this.memoryStore.reviewSessions.find(s => s.id === id);
      if (!session) return null;
      return {
        id: session.id,
        quickNoteIds: session.quick_note_ids,
        startedAt: session.started_at,
        completedAt: session.completed_at || undefined,
        isComplete: Boolean(session.is_complete)
      };
    }

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
    if (this.fallbackMode) {
      const existingIndex = this.memoryStore.reviewSessions.findIndex(s => s.id === session.id);
      const sessionData = {
        id: session.id,
        quick_note_ids: session.quickNoteIds,
        started_at: session.startedAt.toISOString(),
        completed_at: session.completedAt?.toISOString() || null,
        is_complete: session.isComplete ? 1 : 0
      };
      
      if (existingIndex >= 0) {
        this.memoryStore.reviewSessions[existingIndex] = sessionData;
      } else {
        this.memoryStore.reviewSessions.push(sessionData);
      }
      return;
    }

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
    if (this.fallbackMode) {
      this.memoryStore.reviewSessions = this.memoryStore.reviewSessions.filter(s => s.id !== id);
      return;
    }
    this.db.prepare('DELETE FROM review_sessions WHERE id = ?').run(id);
  }

  getActiveReviewSession(): ReviewSessionEntity | null {
    if (this.fallbackMode) {
      const session = this.memoryStore.reviewSessions
        .filter(s => s.is_complete === 0)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
      if (!session) return null;
      return {
        id: session.id,
        quickNoteIds: session.quick_note_ids,
        startedAt: session.started_at,
        completedAt: session.completed_at || undefined,
        isComplete: Boolean(session.is_complete)
      };
    }

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

