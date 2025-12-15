// Domain
export { QuickNote } from './domain/QuickNote';
export { PermanentNote } from './domain/PermanentNote';

// Data
export { notesRepository, type NotesRepository } from './data/notesRepository';

// Hooks
export { useQuickNotes, useQuickNotesStatus } from './hooks/useQuickNotes';
export { usePermanentNotes, usePermanentNotesSearch } from './hooks/usePermanentNotes';
