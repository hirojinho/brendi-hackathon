import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NoteDisplayItem } from './NotesManagementPanel';
import { VirtualScrollList } from '../common/VirtualScrollList';
import { Pagination } from '../common/Pagination';
import { SearchHighlighter } from '../common/SearchHighlighter';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { NotesSearchIndex, SearchResult } from '../../utils/searchIndex';
import './OptimizedNotesList.css';

export interface OptimizedNotesListProps {
  notes: NoteDisplayItem[];
  searchQuery: string;
  bulkSelectionMode?: boolean;
  selectedNotes?: Set<string>;
  onNoteClick?: (note: NoteDisplayItem) => void;
  onSelectionChange?: (noteId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  containerHeight?: number;
  enableVirtualScrolling?: boolean;
  enablePagination?: boolean;
  itemsPerPage?: number;
}

const ITEM_HEIGHT = 120; // Height of each note card in pixels
const DEFAULT_CONTAINER_HEIGHT = 600;
const DEFAULT_ITEMS_PER_PAGE = 50;
const VIRTUAL_SCROLL_THRESHOLD = 100; // Use virtual scrolling when more than 100 items

export const OptimizedNotesList: React.FC<OptimizedNotesListProps> = ({
  notes,
  searchQuery,
  bulkSelectionMode = false,
  selectedNotes = new Set(),
  onNoteClick,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  containerHeight = DEFAULT_CONTAINER_HEIGHT,
  enableVirtualScrolling = true,
  enablePagination = true,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchIndexRef = useRef<NotesSearchIndex>(new NotesSearchIndex());

  // Rebuild search index when notes change
  useEffect(() => {
    const { result } = performanceMonitor.timeOperation(
      'build-search-index',
      () => {
        searchIndexRef.current.buildIndex(notes);
        return true;
      },
      notes.length
    );
  }, [notes]);

  // Perform search when query or notes change
  useEffect(() => {
    const { result } = performanceMonitor.timeOperation(
      'search-notes',
      () => {
        const results = searchIndexRef.current.search(searchQuery, notes);
        setSearchResults(results);
        setCurrentPage(1); // Reset to first page on new search
        return results;
      },
      notes.length
    );
  }, [searchQuery, notes]);

  // Get current page items
  const paginatedResults = useMemo(() => {
    if (!enablePagination) {
      return searchResults;
    }

    const { result } = performanceMonitor.timeOperation(
      'paginate-results',
      () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return searchResults.slice(startIndex, endIndex);
      },
      searchResults.length
    );

    return result;
  }, [searchResults, currentPage, pageSize, enablePagination]);

  // Determine if we should use virtual scrolling
  const shouldUseVirtualScrolling = useMemo(() => {
    return enableVirtualScrolling && 
           paginatedResults.length > VIRTUAL_SCROLL_THRESHOLD;
  }, [enableVirtualScrolling, paginatedResults.length]);

  // Get display items (either search results or original notes)
  const displayItems = useMemo(() => {
    return paginatedResults.map(result => result.item);
  }, [paginatedResults]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page
  }, []);

  const renderNoteCard = useCallback((note: NoteDisplayItem, _index: number) => {
    return (
      <NoteCard
        key={`${note.type}-${note.id}`}
        note={note}
        searchQuery={searchQuery}
        bulkSelectionMode={bulkSelectionMode}
        isSelected={selectedNotes.has(note.id)}
        onNoteClick={onNoteClick}
        onSelectionChange={onSelectionChange}
      />
    );
  }, [searchQuery, bulkSelectionMode, selectedNotes, onNoteClick, onSelectionChange]);

  const totalPages = Math.ceil(searchResults.length / pageSize);

  // Performance monitoring for render
  useEffect(() => {
    performanceMonitor.timeOperation(
      'render-notes-list',
      () => true,
      displayItems.length
    );
  });

  if (notes.length === 0) {
    return (
      <div className="optimized-notes-list empty">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>No Notes Found</h2>
          <p>Start taking notes to see them here</p>
        </div>
      </div>
    );
  }

  if (searchResults.length === 0 && searchQuery.trim()) {
    return (
      <div className="optimized-notes-list empty">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h2>No Results Found</h2>
          <p>Try adjusting your search query or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="optimized-notes-list">
      {/* Bulk selection controls */}
      {bulkSelectionMode && (
        <div className="bulk-selection-header">
          <div className="selection-info">
            <span>{selectedNotes.size} selected</span>
          </div>
          <div className="selection-actions">
            <button onClick={onSelectAll} className="select-all-button">
              Select All
            </button>
            <button onClick={onDeselectAll} className="deselect-all-button">
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Performance info for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-info">
          <span>
            Showing {displayItems.length} of {searchResults.length} notes
            {shouldUseVirtualScrolling && ' (Virtual Scrolling)'}
          </span>
        </div>
      )}

      {/* Notes list */}
      <div className="notes-list-container">
        {shouldUseVirtualScrolling ? (
          <VirtualScrollList
            items={displayItems}
            itemHeight={ITEM_HEIGHT}
            containerHeight={containerHeight}
            renderItem={renderNoteCard}
            className="virtual-notes-list"
          />
        ) : (
          <div className="standard-notes-list" style={{ maxHeight: containerHeight, overflow: 'auto' }}>
            {displayItems.map((note, index) => renderNoteCard(note, index))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={searchResults.length}
          itemsPerPage={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[25, 50, 100, 200]}
          showPageSizeSelector={true}
          showItemCount={true}
        />
      )}
    </div>
  );
};

interface NoteCardProps {
  note: NoteDisplayItem;
  searchQuery: string;
  bulkSelectionMode?: boolean;
  isSelected?: boolean;
  onNoteClick?: (note: NoteDisplayItem) => void;
  onSelectionChange?: (noteId: string, selected: boolean) => void;
}

const NoteCard: React.FC<NoteCardProps> = React.memo(({ 
  note, 
  searchQuery, 
  bulkSelectionMode = false,
  isSelected = false,
  onNoteClick,
  onSelectionChange
}) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleClick = useCallback(() => {
    if (bulkSelectionMode && note.type === 'quick' && note.reviewStatus === 'pending') {
      // In bulk selection mode, toggle selection for reviewable notes
      if (onSelectionChange) {
        onSelectionChange(note.id, !isSelected);
      }
    } else if (onNoteClick) {
      onNoteClick(note);
    }
  }, [bulkSelectionMode, note, isSelected, onSelectionChange, onNoteClick]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(note.id, e.target.checked);
    }
  }, [note.id, onSelectionChange]);

  return (
    <div 
      className={`note-card ${note.type}-note ${bulkSelectionMode ? 'bulk-mode' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="note-header">
        {/* Bulk Selection Checkbox */}
        {bulkSelectionMode && note.type === 'quick' && note.reviewStatus === 'pending' && (
          <div className="bulk-selection-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        
        <h3 className="note-title">
          <SearchHighlighter 
            text={note.title} 
            searchQuery={searchQuery}
            maxLength={100}
          />
        </h3>
        <div className="note-meta">
          <span className={`note-type-badge ${note.type}`}>
            {note.type === 'quick' ? 'Quick' : 'Permanent'}
          </span>
          {note.reviewStatus && (
            <span className={`review-status ${note.reviewStatus}`}>
              {note.reviewStatus === 'pending' ? '⏳ Needs Review' : 
               note.reviewStatus === 'reviewed' ? '✅ Reviewed' : 
               '🔄 Transformed'}
            </span>
          )}
        </div>
      </div>
      
      <div className="note-content">
        <p className="note-excerpt">
          <SearchHighlighter 
            text={note.content} 
            searchQuery={searchQuery}
            maxLength={150}
            contextLength={50}
          />
        </p>
      </div>
      
      <div className="note-footer">
        <div className="note-tags">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {note.tags.length > 3 && (
            <span className="tag-overflow">+{note.tags.length - 3}</span>
          )}
        </div>
        
        <div className="note-info">
          {note.contextName && (
            <span className="context-name">{note.contextName}</span>
          )}
          <span className="note-date">{formatDate(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
});