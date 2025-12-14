import Database from 'better-sqlite3';
import { ContextEntity } from '../../domain/entities/index.js';
import path from 'path';
import fs from 'fs';

export class ContextsDatabase {
  private db!: Database.Database;
  private fallbackMode = false;
  private memoryStore: any[] = [];

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
      console.log('[ContextsDatabase] SQLite database initialized successfully');
    } catch (error) {
      console.error('[ContextsDatabase] Failed to initialize SQLite database:', error);
      console.warn('[ContextsDatabase] Falling back to in-memory storage');
      this.fallbackMode = true;
    }
  }

  private isDbAvailable(): boolean {
    return !this.fallbackMode && this.db !== null;
  }

  private initializeTables(): void {
    if (this.fallbackMode) return;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contexts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES contexts(id) ON DELETE CASCADE
      )
    `);
    
    // Add parent_id column if it doesn't exist (migration for existing databases)
    try {
      this.db.exec(`ALTER TABLE contexts ADD COLUMN parent_id TEXT`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contexts_parent_id ON contexts(parent_id)`);
    } catch (e: any) {
      // Column already exists, ignore
      if (!e.message.includes('duplicate column name')) {
        throw e;
      }
    }
    
    // Create index for parent_id if it doesn't exist
    try {
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contexts_parent_id ON contexts(parent_id)`);
    } catch (e: any) {
      // Index already exists, ignore
    }
  }

  getAllContexts(): ContextEntity[] {
    if (this.fallbackMode) {
      return this.memoryStore.map(context => ({
        id: context.id,
        name: context.name,
        description: context.description,
        parentId: context.parent_id || null,
        createdAt: context.created_at,
        lastModified: context.last_modified
      }));
    }
    
    const contexts = this.db.prepare('SELECT * FROM contexts ORDER BY created_at DESC').all() as any[];
    return contexts.map(context => ({
      id: context.id,
      name: context.name,
      description: context.description,
      parentId: context.parent_id || null,
      createdAt: context.created_at,
      lastModified: context.last_modified
    }));
  }

  getContext(id: string): ContextEntity | null {
    const context = this.db.prepare('SELECT * FROM contexts WHERE id = ?').get(id) as any;
    if (!context) return null;
    return {
      id: context.id,
      name: context.name,
      description: context.description,
      parentId: context.parent_id || null,
      createdAt: context.created_at,
      lastModified: context.last_modified
    };
  }

  getChildren(parentId: string): ContextEntity[] {
    const contexts = this.db.prepare('SELECT * FROM contexts WHERE parent_id = ? ORDER BY created_at DESC').all(parentId) as any[];
    return contexts.map(context => ({
      id: context.id,
      name: context.name,
      description: context.description,
      parentId: context.parent_id || null,
      createdAt: context.created_at,
      lastModified: context.last_modified
    }));
  }

  saveContext(context: {
    id: string;
    name: string;
    description: string;
    parentId: string | null;
    createdAt: Date;
    lastModified: Date;
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO contexts (
        id, name, description, parent_id, created_at, last_modified
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      context.id,
      context.name,
      context.description,
      context.parentId || null,
      context.createdAt.toISOString(),
      context.lastModified.toISOString()
    );
  }

  deleteContext(id: string): void {
    this.db.prepare('DELETE FROM contexts WHERE id = ?').run(id);
  }
}

export default ContextsDatabase;

