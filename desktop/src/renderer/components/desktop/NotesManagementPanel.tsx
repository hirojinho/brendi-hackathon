import React, { useState, useEffect, useMemo } from 'react';
import { QuickNote, quickNotesService } from '../../services/quickNotesService';
import { PermanentNote, permanentNotesService } from '../../services/permanentNotesService';
import { Context, contextsService } from '../../services/contextsService';
import { SearchAndFilterBar, NoteFilters, SortOption, DateRange, ReviewStatus } from './SearchAndFilterBar';
import { SearchHighlighter, calculateRelevanceScore, findSearchMatches, SearchMatch } from '../common/SearchHighlighter';
import './NotesManagementPanel.css';

export type DisplayMode = 'unified' | 'quick-only' | 'permanent-only';

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
  relevanceScore?: number;
}

export const NotesManagementPanel: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('unified');
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [permanentNotes, setPermanentNotes] = useState<PermanentNote[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NoteFilters>({
    noteType: 'all',
    contextIds: [],
    tags: [],
    dateRange: null,
    reviewStatus: []
  });
  const [sortOptions, setSortOptions] = useState<SortOption>({
    field: 'createdAt',
    direction: 'desc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quickNotesData, permanentNotesData, contextsData] = await Promise.all([
        quickNotesService.list(),
        permanentNotesService.list(),
        contextsService.list()
      ]);
      
      setQuickNotes(quickNotesData);
      setPermanentNotes(permanentNotesData);
      setContexts(contextsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  // Convert notes to unified display format
  const convertToDisplayItems = (
    quickNotes: QuickNote[], 
    permanentNotes: PermanentNote[], 
    contexts: Context[],
    searchQuery: string
  ): NoteDisplayItem[] => {
    const contextMap = new Map(contexts.map(c => [c.id, c.name]));
    
    const quickDisplayItems: NoteDisplayItem[] = quickNotes.map(note => {
      const titleMatches = findSearchMatches(note.title, searchQuery, 'title');
      const contentMatches = findSearchMatches(note.content, searchQuery, 'content');
      const relevanceScore = calculateRelevanceScore(note.title, note.content, note.tags, searchQuery);
      
      return {
        id: note.id,
        type: 'quick' as const,
        title: note.title,
        content: note.content,
        excerpt: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''),
        tags: note.tags,
        contextId: note.contextId,
        contextName: note.contextId ? contextMap.get(note.contextId) : undefined,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.lastModified),
        reviewStatus: 'pending' as const,
        searchMatches: [...titleMatches, ...contentMatches],
        relevanceScore
      };
    });

    const permanentDisplayItems: NoteDisplayItem[] = permanentNotes.map(note => {
      const titleMatches = findSearchMatches(note.title, searchQuery, 'title');
      const contentMatches = findSearchMatches(note.content, searchQuery, 'content');
      const relevanceScore = calculateRelevanceScore(note.title, note.content, note.tags, searchQuery);
      
      return {
        id: note.id,
        type: 'permanent' as const,
        title: note.title,
        content: note.content,
        excerpt: note.content.substring(0, 150) + (note.content.length > 150 ? '...' : ''),
        tags: note.tags,
        contextId: null, // Permanent notes don't have contexts in current implementation
        contextName: undefined,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        reviewStatus: 'reviewed' as const,
        searchMatches: [...titleMatches, ...contentMatches],
        relevanceScore
      };
    });

    return [...quickDisplayItems, ...permanentDisplayItems];
  };

  // Get all available tags for filtering
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    quickNotes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    permanentNotes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [quickNotes, permanentNotes]);

  // Filter and sort notes based on current settings
  const filteredAndSortedNotes = useMemo(() => {
    let allNotes = convertToDisplayItems(quickNotes, permanentNotes, contexts, searchQuery);

    // Apply display mode filter
    if (displayMode === 'quick-only') {
      allNotes = allNotes.filter(note => note.type === 'quick');
    } else if (displayMode === 'permanent-only') {
      allNotes = allNotes.filter(note => note.type === 'permanent');
    }

    // Apply note type filter
    if (filters.noteType !== 'all') {
      allNotes = allNotes.filter(note => note.type === filters.noteType);
    }

    // Apply context filter
    if (filters.contextIds.length > 0) {
      allNotes = allNotes.filter(note => 
        note.contextId && filters.contextIds.includes(note.contextId)
      );
    }

    // Apply tags filter
    if (filters.tags.length > 0) {
      allNotes = allNotes.filter(note =>
        filters.tags.some(tag => note.tags.includes(tag))
      );
    }

    // Apply review status filter
    if (filters.reviewStatus.length > 0) {
      allNotes = allNotes.filter(note =>
        note.reviewStatus && filters.reviewStatus.includes(note.reviewStatus)
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      allNotes = allNotes.filter(note => {
        const noteDate = note.updatedAt;
        return noteDate >= filters.dateRange!.start && noteDate <= filters.dateRange!.end;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allNotes = allNotes.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    allNotes.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOptions.field) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
      }
      
      return sortOptions.direction === 'desc' ? -comparison : comparison;
    });

    return allNotes;
  }, [quickNotes, permanentNotes, contexts, displayMode, filters, sortOptions, searchQuery]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: NoteFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOptions(newSort);
  };

  if (loading) {
    return (
      <div className="notes-management-panel">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-management-panel">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Notes</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-management-panel">
      <div className="panel-header">
        <div className="header-top">
          <h1>Notes</h1>
          <div className="header-actions">
            <button onClick={loadData} className="refresh-button" title="Refresh">
              🔄
            </button>
          </div>
        </div>
        
        {/* Mode Switcher */}
        <div className="mode-switcher">
          <button
            className={`mode-button ${displayMode === 'unified' ? 'active' : ''}`}
            onClick={() => setDisplayMode('unified')}
          >
            All Notes
          </button>
          <button
            className={`mode-button ${displayMode === 'quick-only' ? 'active' : ''}`}
            onClick={() => setDisplayMode('quick-only')}
          >
            Quick Notes
          </button>
          <button
            className={`mode-button ${displayMode === 'permanent-only' ? 'active' : ''}`}
            onClick={() => setDisplayMode('permanent-only')}
          >
            Permanent Notes
          </button>
        </div>

        {/* Enhanced Search and Filters */}
        <SearchAndFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          sortBy={sortOptions}
          onSortChange={handleSortChange}
          showAdvancedFilters={showAdvancedFilters}
          onToggleAdvancedFilters={setShowAdvancedFilters}
          contexts={contexts}
          availableTags={availableTags}
          totalNotesCount={quickNotes.length + permanentNotes.length}
          filteredNotesCount={filteredAndSortedNotes.length}
        />
      </div>

      <div className="panel-content">
        {filteredAndSortedNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>No Notes Found</h2>
            <p>
              {searchQuery || filters.tags.length > 0 || filters.contextIds.length > 0 || filters.reviewStatus.length > 0 || filters.dateRange
                ? 'Try adjusting your search or filters'
                : 'Start taking notes to see them here'
              }
            </p>
          </div>
        ) : (
          <div className="notes-list">
            {filteredAndSortedNotes.map(note => (
              <NoteCard 
                key={`${note.type}-${note.id}`} 
                note={note}
                searchQuery={searchQuery}
                onNoteClick={(note) => {
                  // TODO: Implement note detail view or editing
                  console.log('Note clicked:', note);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface NoteCardProps {
  note: NoteDisplayItem;
  searchQuery: string;
  onNoteClick?: (note: NoteDisplayItem) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, searchQuery, onNoteClick }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleClick = () => {
    if (onNoteClick) {
      onNoteClick(note);
    }
  };

  return (
    <div 
      className={`note-card ${note.type}-note`}
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
              {note.reviewStatus === 'pending' ? 'Needs Review' : 'Reviewed'}
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
          {note.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
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
};