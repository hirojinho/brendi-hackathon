import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { QuickNote } from '../../services/quickNotesService';
import type { PermanentNote } from '../../services/permanentNotesService';
import type { Context } from '../../services/contextsService';
import { SearchHighlighter } from '../common';
import './UnifiedNotesList.css';

// Unified note display interface as defined in the design document
export interface NoteDisplayItem {
  id: string;
  type: 'quick' | 'permanent';
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  contextId: string | null;
  contextName?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewStatus?: 'pending' | 'reviewed' | 'transformed';
  searchMatches?: SearchMatch[];
}

export interface SearchMatch {
  field: 'title' | 'content';
  startIndex: number;
  endIndex: number;
  context: string;
}

export interface UnifiedNotesListProps {
  notes: (QuickNote | PermanentNote)[];
  contexts: Context[];
  searchQuery?: string;
  highlightMatches?: boolean;
  selectedNoteIds?: string[];
  bulkSelectionMode?: boolean;
  onNoteClick?: (note: NoteDisplayItem) => void;
  onNoteEdit?: (note: NoteDisplayItem) => void;
  onNoteDelete?: (noteId: string) => void;
  onNoteSelect?: (noteId: string, selected: boolean) => void;
  onBulkAction?: (action: string, noteIds: string[]) => void;
  className?: string;
}

// Helper function to convert notes to unified display format
const convertToDisplayItem = (
  note: QuickNote | PermanentNote, 
  contexts: Context[]
): NoteDisplayItem => {
  const isQuickNote = 'lastModified' in note;
  
  // QuickNote has contextId, PermanentNote doesn't
  const contextId = isQuickNote ? (note as QuickNote).contextId : null;
  const contextName = contextId ? 
    contexts.find(c => c.id === contextId)?.name : undefined;
  
  // Create excerpt from content (first 150 characters)
  const excerpt = note.content.length > 150 
    ? note.content.substring(0, 150) + '...'
    : note.content;

  // Check if quick note has review status
  const hasReviewStatus = isQuickNote && 'isReviewRequired' in note;
  const reviewStatus = hasReviewStatus && (note as any).isReviewRequired ? 'pending' : 'reviewed';

  return {
    id: note.id,
    type: isQuickNote ? 'quick' : 'permanent',
    title: note.title,
    content: note.content,
    excerpt,
    tags: note.tags,
    contextId,
    contextName,
    createdAt: new Date(note.createdAt),
    updatedAt: new Date(isQuickNote ? (note as QuickNote).lastModified : (note as PermanentNote).updatedAt),
    reviewStatus
  };
};

// Individual note card component
interface NoteCardProps {
  note: NoteDisplayItem;
  searchQuery?: string;
  isSelected: boolean;
  bulkSelectionMode: boolean;
  onNoteClick: (note: NoteDisplayItem) => void;
  onNoteEdit: (note: NoteDisplayItem) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteSelect: (noteId: string, selected: boolean) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  searchQuery = '',
  isSelected,
  bulkSelectionMode,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onNoteSelect
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if (bulkSelectionMode) {
      e.preventDefault();
      onNoteSelect(note.id, !isSelected);
    } else {
      onNoteClick(note);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onNoteSelect(note.id, e.target.checked);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNoteEdit(note);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      onNoteDelete(note.id);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const cardId = `note-card-${note.id}`;
  const titleId = `note-title-${note.id}`;
  const contentId = `note-content-${note.id}`;

  return (
    <article 
      id={cardId}
      className={`unified-note-card ${note.type} ${isSelected ? 'selected' : ''} ${bulkSelectionMode ? 'bulk-mode' : ''} keyboard-focusable`}
      data-note-id={note.id}
      onClick={handleCardClick}
      role={bulkSelectionMode ? 'checkbox' : 'button'}
      tabIndex={0}
      aria-checked={bulkSelectionMode ? isSelected : undefined}
      aria-labelledby={titleId}
      aria-describedby={contentId}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(e as any);
        } else if (e.key === 'Delete' && !bulkSelectionMode) {
          e.preventDefault();
          handleDeleteClick(e as any);
        }
      }}
    >
      {bulkSelectionMode && (
        <div className="note-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select note: ${note.title}`}
            tabIndex={-1}
          />
        </div>
      )}

      <div className="note-header">
        <div className="note-title-row">
          <h3 id={titleId} className="note-title">
            <SearchHighlighter text={note.title} searchQuery={searchQuery} />
          </h3>
          <div className="note-indicators" role="group" aria-label="Note indicators">
            <span 
              className={`note-type-badge ${note.type}`}
              aria-label={`${note.type === 'quick' ? 'Quick' : 'Permanent'} note`}
              title={`${note.type === 'quick' ? 'Quick' : 'Permanent'} note`}
            >
              {note.type === 'quick' ? 'Q' : 'P'}
            </span>
            {note.reviewStatus === 'pending' && (
              <span 
                className="review-status-badge pending" 
                title="Review Required"
                aria-label="Review required"
                role="status"
              >
                <span aria-hidden="true">⚠️</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="note-meta" aria-label="Note metadata">
          <time 
            className="note-date"
            dateTime={note.createdAt.toISOString()}
            title={`Created: ${formatDate(note.createdAt)}`}
          >
            Created: {formatDate(note.createdAt)}
          </time>
          {note.updatedAt.getTime() !== note.createdAt.getTime() && (
            <time 
              className="note-date"
              dateTime={note.updatedAt.toISOString()}
              title={`Updated: ${formatDate(note.updatedAt)}`}
            >
              Updated: {formatDate(note.updatedAt)}
            </time>
          )}
        </div>
      </div>

      {note.contextId && note.contextName && (
        <div className="note-context">
          <span 
            className="context-badge" 
            title={`Context: ${note.contextName}`}
            aria-label={`Context: ${note.contextName}`}
          >
            <span aria-hidden="true">📁</span> {note.contextName}
          </span>
        </div>
      )}

      <div id={contentId} className="note-content" aria-label="Note content">
        <SearchHighlighter text={note.excerpt} searchQuery={searchQuery} />
      </div>

      {note.tags.length > 0 && (
        <div className="note-tags" role="group" aria-label={`Tags: ${note.tags.join(', ')}`}>
          {note.tags.map((tag, idx) => (
            <span key={idx} className="note-tag" aria-label={`Tag: ${tag}`}>
              <SearchHighlighter text={tag} searchQuery={searchQuery} />
            </span>
          ))}
        </div>
      )}

      <div className="note-actions" role="group" aria-label="Note actions">
        <button 
          className="action-btn edit-btn touch-target keyboard-focusable"
          onClick={handleEditClick}
          title="Edit note"
          aria-label={`Edit note: ${note.title}`}
          tabIndex={-1}
        >
          <span aria-hidden="true">✏️</span>
          <span className="sr-only">Edit</span>
        </button>
        <button 
          className="action-btn delete-btn touch-target keyboard-focusable"
          onClick={handleDeleteClick}
          title="Delete note"
          aria-label={`Delete note: ${note.title}`}
          tabIndex={-1}
        >
          <span aria-hidden="true">🗑️</span>
          <span className="sr-only">Delete</span>
        </button>
      </div>
    </article>
  );
};

export const UnifiedNotesList: React.FC<UnifiedNotesListProps> = ({
  notes,
  contexts,
  searchQuery = '',
  highlightMatches = true,
  selectedNoteIds = [],
  bulkSelectionMode = false,
  onNoteClick = () => {},
  onNoteEdit = () => {},
  onNoteDelete = () => {},
  onNoteSelect = () => {},
  onBulkAction = () => {},
  className = ''
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Convert notes to unified display format
  const displayNotes = notes.map(note => convertToDisplayItem(note, contexts));

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!listRef.current) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, displayNotes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < displayNotes.length) {
          const note = displayNotes[focusedIndex];
          if (bulkSelectionMode) {
            const isSelected = selectedNoteIds.includes(note.id);
            onNoteSelect(note.id, !isSelected);
          } else {
            onNoteClick(note);
          }
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
      case 'a':
        if ((e.metaKey || e.ctrlKey) && bulkSelectionMode) {
          e.preventDefault();
          // Select all notes
          displayNotes.forEach(note => {
            if (!selectedNoteIds.includes(note.id)) {
              onNoteSelect(note.id, true);
            }
          });
        }
        break;
    }
  }, [focusedIndex, displayNotes, bulkSelectionMode, selectedNoteIds, onNoteClick, onNoteSelect]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && noteRefs.current[focusedIndex]) {
      noteRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Keyboard event listener
  useEffect(() => {
    const element = listRef.current;
    if (element) {
      element.addEventListener('keydown', handleKeyDown);
      return () => element.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedNoteIds.length > 0) {
      onBulkAction('delete', selectedNoteIds);
    }
  };

  const handleBulkTag = () => {
    if (selectedNoteIds.length > 0) {
      onBulkAction('tag', selectedNoteIds);
    }
  };

  if (displayNotes.length === 0) {
    return (
      <div className={`unified-notes-list empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No notes found</h3>
          <p>
            {searchQuery 
              ? `No notes match "${searchQuery}"`
              : 'Create your first note to get started'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`unified-notes-list ${className}`}
      ref={listRef}
      tabIndex={0}
      role="list"
      aria-label="Notes list"
    >
      {bulkSelectionMode && selectedNoteIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span className="selection-count">
            {selectedNoteIds.length} note{selectedNoteIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions">
            <button 
              className="bulk-action-btn tag-btn"
              onClick={handleBulkTag}
            >
              Add Tags
            </button>
            <button 
              className="bulk-action-btn delete-btn"
              onClick={handleBulkDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="notes-grid">
        {displayNotes.map((note, index) => (
          <div
            key={note.id}
            ref={(el) => {
              noteRefs.current[index] = el;
            }}
          >
            <NoteCard
              note={note}
              searchQuery={highlightMatches ? searchQuery : ''}
              isSelected={selectedNoteIds.includes(note.id)}
              bulkSelectionMode={bulkSelectionMode}
              onNoteClick={onNoteClick}
              onNoteEdit={onNoteEdit}
              onNoteDelete={onNoteDelete}
              onNoteSelect={onNoteSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnifiedNotesList;