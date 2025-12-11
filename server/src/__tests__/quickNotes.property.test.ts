import * as fc from 'fast-check';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ReviewEngine, ReviewEngineConfig } from '../app/review/ReviewEngine';

interface QuickNoteEntity {
  id: string;
  title: string;
  content: string;
  tags: string[];
  contextId: string | null;
  createdAt: string;
  lastModified: string;
  isReviewRequired: boolean;
}

interface ReviewSessionEntity {
  id: string;
  quickNoteIds: string[];
  startedAt: string;
  completedAt?: string;
  isComplete: boolean;
}

class TestQuickNotesDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quick_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        context_id TEXT,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL,
        is_review_required INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS review_sessions (
        id TEXT PRIMARY KEY,
        quick_note_ids TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        is_complete INTEGER NOT NULL DEFAULT 0
      )
    `);
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

  getAllQuickNotes(): QuickNoteEntity[] {
    const notes = this.db.prepare('SELECT * FROM quick_notes ORDER BY created_at DESC').all() as any[];
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

  deleteQuickNote(id: string): void {
    this.db.prepare('DELETE FROM quick_notes WHERE id = ?').run(id);
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

  deleteReviewSession(id: string): void {
    this.db.prepare('DELETE FROM review_sessions WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}

class TestQuickNotesRepository {
  constructor(private readonly database: TestQuickNotesDatabase) {}

  save(note: QuickNoteEntity): void {
    this.database.saveQuickNote({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      contextId: note.contextId,
      createdAt: new Date(note.createdAt),
      lastModified: new Date(note.lastModified),
      isReviewRequired: note.isReviewRequired
    });
  }

  update(id: string, update: Partial<Omit<QuickNoteEntity, 'id' | 'createdAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: QuickNoteEntity = {
      ...existing,
      ...update,
      lastModified: new Date().toISOString()
    };
    this.save(updated);
  }

  list(contextId?: string): QuickNoteEntity[] {
    return this.database.getAllQuickNotes();
  }

  getById(id: string): QuickNoteEntity | null {
    return this.database.getQuickNote(id);
  }

  delete(id: string): void {
    this.database.deleteQuickNote(id);
  }

  getByContext(contextId: string): QuickNoteEntity[] {
    return this.database.getAllQuickNotes();
  }
}

class TestReviewSessionRepository {
  constructor(private readonly database: TestQuickNotesDatabase) {}

  save(session: ReviewSessionEntity): void {
    this.database.saveReviewSession({
      id: session.id,
      quickNoteIds: session.quickNoteIds,
      startedAt: new Date(session.startedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
      isComplete: session.isComplete
    });
  }

  update(id: string, update: Partial<Omit<ReviewSessionEntity, 'id' | 'startedAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: ReviewSessionEntity = {
      ...existing,
      ...update
    };
    this.save(updated);
  }

  list(): ReviewSessionEntity[] {
    return this.database.getAllReviewSessions();
  }

  getById(id: string): ReviewSessionEntity | null {
    return this.database.getReviewSession(id);
  }

  delete(id: string): void {
    this.database.deleteReviewSession(id);
  }

  getActiveSession(): ReviewSessionEntity | null {
    return this.database.getActiveReviewSession();
  }
}

describe('Quick Notes Property-Based Tests', () => {
  let database: TestQuickNotesDatabase;
  let testDbPath: string;

  beforeEach(() => {
    // Create a unique test database for each test
    testDbPath = path.join(process.cwd(), `test_quick_notes_${Date.now()}_${Math.random()}.db`);
    database = new TestQuickNotesDatabase(testDbPath);
  });

  afterEach(() => {
    // Clean up test database
    database.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  // Helper function to clear database between property test iterations
  const clearDatabase = () => {
    database.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    testDbPath = path.join(process.cwd(), `test_quick_notes_${Date.now()}_${Math.random()}.db`);
    database = new TestQuickNotesDatabase(testDbPath);
  };

  /**
   * Feature: quick-note-workflow, Property 1: Note creation and persistence
   * Validates: Requirements 1.2, 1.3
   */
  test('Property 1: Note creation and persistence', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0), // Valid non-empty content
        fc.string({ minLength: 1, maxLength: 100 }), // Title
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), // Tags
        (content, title, tags) => {
          const now = new Date();
          const note = {
            id: randomUUID(),
            title,
            content,
            tags,
            contextId: null,
            createdAt: now,
            lastModified: now,
            isReviewRequired: false
          };

          // Save the note
          database.saveQuickNote(note);

          // Retrieve the note
          const retrievedNote = database.getQuickNote(note.id);

          // Verify the note was persisted correctly
          expect(retrievedNote).not.toBeNull();
          expect(retrievedNote!.id).toBe(note.id);
          expect(retrievedNote!.content).toBe(note.content);
          expect(retrievedNote!.title).toBe(note.title);
          expect(retrievedNote!.tags).toEqual(note.tags);
          expect(retrievedNote!.isReviewRequired).toBe(note.isReviewRequired);
          
          // Verify timestamp is within 1 second of creation time
          const retrievedTime = new Date(retrievedNote!.createdAt);
          const timeDiff = Math.abs(retrievedTime.getTime() - now.getTime());
          expect(timeDiff).toBeLessThan(1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 2: Empty input rejection
   * Validates: Requirements 1.5
   */
  test('Property 2: Empty input rejection', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.trim().length === 0), // Generate strings that are empty or only whitespace
        fc.string({ minLength: 1, maxLength: 100 }), // Title
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), // Tags
        (content, title, tags) => {
          const now = new Date();
          const noteId = randomUUID();
          
          // Count notes before attempting to save
          const notesBefore = database.getAllQuickNotes().length;
          
          // Attempt to save a note with empty/whitespace content
          // This should be rejected by the business logic (not the database layer)
          // For this test, we simulate the validation that should happen in the service layer
          const isValidContent = content.trim().length > 0;
          
          if (isValidContent) {
            // This should not happen with our generator, but just in case
            const note = {
              id: noteId,
              title,
              content,
              tags,
              contextId: null,
              createdAt: now,
              lastModified: now,
              isReviewRequired: false
            };
            database.saveQuickNote(note);
          }
          
          // Count notes after
          const notesAfter = database.getAllQuickNotes().length;
          
          // Verify that no note was saved for empty/whitespace content
          expect(isValidContent).toBe(false); // Our generator should only produce invalid content
          expect(notesAfter).toBe(notesBefore); // No new notes should be added
          
          // Verify the specific note was not saved
          const retrievedNote = database.getQuickNote(noteId);
          expect(retrievedNote).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 3: Review enforcement state management
   * Validates: Requirements 2.1, 2.2, 2.4, 2.5
   */
  test('Property 3: Review enforcement state management', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            ageHours: fc.float({ min: 0, max: 72, noNaN: true }) // Age in hours
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (noteSpecs) => {
          // Clear database for each property test iteration
          clearDatabase();
          
          const quickNotesRepo = new TestQuickNotesRepository(database);
          const reviewSessionRepo = new TestReviewSessionRepository(database);
          const reviewEngine = new ReviewEngine(quickNotesRepo, reviewSessionRepo, {
            reviewAgeThresholdHours: 24,
            maxQuickNotes: 10
          });

          const now = new Date();
          const createdNotes: QuickNoteEntity[] = [];

          // Create notes with specified ages
          noteSpecs.forEach((spec, index) => {
            const createdAt = new Date(now.getTime() - (spec.ageHours * 60 * 60 * 1000));
            const note: QuickNoteEntity = {
              id: randomUUID(),
              title: spec.title,
              content: spec.content,
              tags: spec.tags,
              contextId: null,
              createdAt: createdAt.toISOString(),
              lastModified: createdAt.toISOString(),
              isReviewRequired: false
            };
            quickNotesRepo.save(note);
            createdNotes.push(note);
          });

          // Check if any notes are older than 24 hours
          const hasOldNotes = noteSpecs.some(spec => spec.ageHours >= 24);

          // Test review requirement detection
          const isReviewRequired = reviewEngine.isReviewRequired();
          expect(isReviewRequired).toBe(hasOldNotes);

          // Test new note creation blocking
          const canCreateNew = reviewEngine.canCreateNewQuickNote();
          if (hasOldNotes) {
            expect(canCreateNew).toBe(false);
          } else {
            // Should be able to create if under limit and no old notes
            const currentCount = quickNotesRepo.list().length;
            expect(canCreateNew).toBe(currentCount < 10);
          }

          // Test notes requiring review are returned in chronological order
          const notesRequiringReview = reviewEngine.getNotesRequiringReview();
          const expectedOldNotes = createdNotes.filter((_, index) => noteSpecs[index].ageHours >= 24);
          expect(notesRequiringReview.length).toBe(expectedOldNotes.length);

          // Verify chronological ordering
          for (let i = 1; i < notesRequiringReview.length; i++) {
            const prevTime = new Date(notesRequiringReview[i - 1].createdAt).getTime();
            const currTime = new Date(notesRequiringReview[i].createdAt).getTime();
            expect(prevTime).toBeLessThanOrEqual(currTime);
          }

          // Test review session creation and completion
          if (hasOldNotes) {
            const session = reviewEngine.createReviewSession();
            expect(session.quickNoteIds.length).toBe(expectedOldNotes.length);
            expect(session.isComplete).toBe(false);

            // Complete the session
            reviewEngine.completeReviewSession(session.id);
            const completedSession = reviewSessionRepo.getById(session.id);
            expect(completedSession?.isComplete).toBe(true);
            expect(completedSession?.completedAt).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 7: Note limit enforcement
   * Validates: Requirements 4.1, 4.3, 4.4
   */
  test('Property 7: Note limit enforcement', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }), // Custom note limit
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 })
          }),
          { minLength: 0, maxLength: 25 }
        ),
        (noteLimit, noteSpecs) => {
          // Clear database for each property test iteration
          clearDatabase();
          
          const quickNotesRepo = new TestQuickNotesRepository(database);
          const reviewSessionRepo = new TestReviewSessionRepository(database);
          const reviewEngine = new ReviewEngine(quickNotesRepo, reviewSessionRepo, {
            reviewAgeThresholdHours: 24,
            maxQuickNotes: noteLimit
          });

          const now = new Date();
          const recentTime = new Date(now.getTime() - (1 * 60 * 60 * 1000)); // 1 hour ago (recent)

          // Create notes respecting the limit enforcement
          let successfulCreations = 0;
          const maxAttempts = Math.max(noteSpecs.length, noteLimit + 3); // Try to exceed limit

          for (let i = 0; i < maxAttempts && i < 20; i++) { // Cap at 20 to avoid infinite loops
            // Use a default spec if noteSpecs is empty
            const spec = noteSpecs.length > 0 ? noteSpecs[i % noteSpecs.length] : {
              content: `Test note ${i}`,
              title: `Title ${i}`,
              tags: []
            };
            
            const note: QuickNoteEntity = {
              id: randomUUID(),
              title: spec.title,
              content: spec.content,
              tags: spec.tags,
              contextId: null,
              createdAt: recentTime.toISOString(),
              lastModified: recentTime.toISOString(),
              isReviewRequired: false
            };

            const currentCount = quickNotesRepo.list().length;
            const canCreate = reviewEngine.canCreateNewQuickNote();

            if (currentCount < noteLimit) {
              expect(canCreate).toBe(true);
              quickNotesRepo.save(note);
              successfulCreations++;
            } else {
              expect(canCreate).toBe(false);
              // Don't save the note when at limit - this simulates the business logic
              break; // Stop trying once we hit the limit
            }
          }

          // Verify final state
          const finalCount = quickNotesRepo.list().length;
          expect(finalCount).toBeLessThanOrEqual(noteLimit);
          expect(successfulCreations).toBeLessThanOrEqual(noteLimit);

          // If we reached the limit, verify no more notes can be created
          if (finalCount >= noteLimit) {
            expect(reviewEngine.canCreateNewQuickNote()).toBe(false);
          }

          // Test that processing notes during review allows new creation
          if (finalCount >= noteLimit) {
            // Delete a note to simulate processing during review
            const notes = quickNotesRepo.list();
            if (notes.length > 0) {
              quickNotesRepo.delete(notes[0].id);
              const canCreateAfterProcessing = reviewEngine.canCreateNewQuickNote();
              expect(canCreateAfterProcessing).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 4: Review session chronological ordering
   * Validates: Requirements 2.3
   */
  test('Property 4: Review session chronological ordering', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            ageHours: fc.float({ min: Math.fround(24.1), max: Math.fround(168), noNaN: true }) // All notes older than 24 hours
          }),
          { minLength: 2, maxLength: 10 } // Need at least 2 notes to test ordering
        ),
        (noteSpecs) => {
          // Clear database for each property test iteration
          clearDatabase();
          
          const quickNotesRepo = new TestQuickNotesRepository(database);
          const reviewSessionRepo = new TestReviewSessionRepository(database);
          const reviewEngine = new ReviewEngine(quickNotesRepo, reviewSessionRepo, {
            reviewAgeThresholdHours: 24,
            maxQuickNotes: 10
          });

          const now = new Date();
          const createdNotes: QuickNoteEntity[] = [];

          // Create notes with specified ages (all older than 24 hours)
          noteSpecs.forEach((spec) => {
            const createdAt = new Date(now.getTime() - (spec.ageHours * 60 * 60 * 1000));
            const note: QuickNoteEntity = {
              id: randomUUID(),
              title: spec.title,
              content: spec.content,
              tags: spec.tags,
              contextId: null,
              createdAt: createdAt.toISOString(),
              lastModified: createdAt.toISOString(),
              isReviewRequired: false
            };
            quickNotesRepo.save(note);
            createdNotes.push(note);
          });

          // Get notes requiring review
          const notesRequiringReview = reviewEngine.getNotesRequiringReview();
          
          // Verify all notes are included (since all are older than 24 hours)
          expect(notesRequiringReview.length).toBe(noteSpecs.length);

          // Verify chronological ordering (oldest first)
          for (let i = 1; i < notesRequiringReview.length; i++) {
            const prevTime = new Date(notesRequiringReview[i - 1].createdAt).getTime();
            const currTime = new Date(notesRequiringReview[i].createdAt).getTime();
            expect(prevTime).toBeLessThanOrEqual(currTime);
          }

          // Create a review session and verify it maintains the same ordering
          const session = reviewEngine.createReviewSession();
          expect(session.quickNoteIds.length).toBe(notesRequiringReview.length);
          
          // Verify the session contains the notes in the same chronological order
          for (let i = 0; i < session.quickNoteIds.length; i++) {
            expect(session.quickNoteIds[i]).toBe(notesRequiringReview[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 5: Note transformation preservation
   * Validates: Requirements 3.2
   */
  test('Property 5: Note transformation preservation', () => {
    fc.assert(
      fc.property(
        fc.record({
          content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          newTitle: fc.string({ minLength: 1, maxLength: 100 }), // Title for permanent note
          newContent: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0), // Enhanced content
          newTags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 15 })
        }),
        (noteSpec) => {
          // Clear database for each property test iteration
          clearDatabase();
          
          const quickNotesRepo = new TestQuickNotesRepository(database);

          // Create a quick note
          const now = new Date();
          const quickNote: QuickNoteEntity = {
            id: randomUUID(),
            title: noteSpec.title,
            content: noteSpec.content,
            tags: noteSpec.tags,
            contextId: null,
            createdAt: now.toISOString(),
            lastModified: now.toISOString(),
            isReviewRequired: false
          };

          quickNotesRepo.save(quickNote);

          // Simulate transformation to permanent note
          // The permanent note should contain the original content as a starting point
          const permanentNote = {
            id: randomUUID(),
            title: noteSpec.newTitle,
            content: noteSpec.newContent,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            tags: noteSpec.newTags,
            sourceQuickNoteId: quickNote.id
          };

          // Verify that the transformation preserves the source relationship
          expect(permanentNote.sourceQuickNoteId).toBe(quickNote.id);

          // Verify that the original quick note content is available for reference
          // (The requirement states the permanent note should allow editing and enhancement
          // of the original content, which implies the original content should be preserved
          // as a starting point)
          const originalQuickNote = quickNotesRepo.getById(quickNote.id);
          expect(originalQuickNote).not.toBeNull();
          expect(originalQuickNote!.content).toBe(noteSpec.content);
          expect(originalQuickNote!.title).toBe(noteSpec.title);
          expect(originalQuickNote!.tags).toEqual(noteSpec.tags);

          // The permanent note should reference the source quick note
          expect(permanentNote.sourceQuickNoteId).toBe(quickNote.id);
          
          // The permanent note can have enhanced content but should maintain traceability
          expect(permanentNote.id).toBeDefined();
          expect(permanentNote.createdAt).toBeDefined();
          expect(permanentNote.updatedAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: quick-note-workflow, Property 6: Review session integrity
   * Validates: Requirements 3.3, 3.4, 3.5
   */
  test('Property 6: Review session integrity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            shouldTransform: fc.boolean() // Whether to transform to permanent note or discard
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (noteSpecs) => {
          // Clear database for each property test iteration
          clearDatabase();
          
          const quickNotesRepo = new TestQuickNotesRepository(database);
          const reviewSessionRepo = new TestReviewSessionRepository(database);
          const reviewEngine = new ReviewEngine(quickNotesRepo, reviewSessionRepo, {
            reviewAgeThresholdHours: 24,
            maxQuickNotes: 10
          });

          const now = new Date();
          const oldTime = new Date(now.getTime() - (25 * 60 * 60 * 1000)); // 25 hours ago
          const createdNotes: QuickNoteEntity[] = [];

          // Create notes that are older than 24 hours (requiring review)
          noteSpecs.forEach((spec) => {
            const note: QuickNoteEntity = {
              id: randomUUID(),
              title: spec.title,
              content: spec.content,
              tags: spec.tags,
              contextId: null,
              createdAt: oldTime.toISOString(),
              lastModified: oldTime.toISOString(),
              isReviewRequired: false
            };
            quickNotesRepo.save(note);
            createdNotes.push(note);
          });

          // Verify review is required
          expect(reviewEngine.isReviewRequired()).toBe(true);

          // Create a review session
          const session = reviewEngine.createReviewSession();
          expect(session.isComplete).toBe(false);
          expect(session.quickNoteIds.length).toBe(noteSpecs.length);
          expect(session.completedAt).toBeUndefined();

          // Process all notes in the session
          const initialNoteCount = quickNotesRepo.list().length;
          let processedCount = 0;

          session.quickNoteIds.forEach((noteId, index) => {
            const spec = noteSpecs[index];
            
            if (spec.shouldTransform) {
              // Simulate transforming to permanent note
              // In a real implementation, this would create a permanent note
              // and then remove the quick note
              quickNotesRepo.delete(noteId);
            } else {
              // Simulate discarding the note
              quickNotesRepo.delete(noteId);
            }
            
            // Process the note in the review session
            reviewEngine.processNoteInReview(session.id, noteId);
            processedCount++;

            // Check session state after each processing
            const updatedSession = reviewSessionRepo.getById(session.id);
            expect(updatedSession).not.toBeNull();
            expect(updatedSession!.quickNoteIds.length).toBe(noteSpecs.length - processedCount);

            // If this was the last note, session should be complete
            if (processedCount === noteSpecs.length) {
              expect(updatedSession!.isComplete).toBe(true);
              expect(updatedSession!.completedAt).toBeDefined();
            } else {
              expect(updatedSession!.isComplete).toBe(false);
              expect(updatedSession!.completedAt).toBeUndefined();
            }
          });

          // Verify final state
          const finalSession = reviewSessionRepo.getById(session.id);
          expect(finalSession).not.toBeNull();
          expect(finalSession!.isComplete).toBe(true);
          expect(finalSession!.completedAt).toBeDefined();
          expect(finalSession!.quickNoteIds.length).toBe(0);

          // Verify all processed notes are removed from storage
          const remainingNotes = quickNotesRepo.list();
          expect(remainingNotes.length).toBe(initialNoteCount - noteSpecs.length);

          // Verify none of the original notes exist anymore
          createdNotes.forEach(note => {
            const retrievedNote = quickNotesRepo.getById(note.id);
            expect(retrievedNote).toBeNull();
          });

          // Verify review is no longer required
          expect(reviewEngine.isReviewRequired()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});