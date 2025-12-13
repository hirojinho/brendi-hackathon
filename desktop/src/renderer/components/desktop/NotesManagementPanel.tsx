import React, { useState, useEffect, useMemo } from 'react';
import { QuickNote, quickNotesService } from '../../services/quickNotesService';
import { PermanentNote, permanentNotesService } from '../../services/permanentNotesService';
import { Context, contextsService } from '../../services/contextsService';
import { SearchAndFilterBar, NoteFilters, SortOption } from './SearchAndFilterBar';
import { calculateRelevanceScore, findSearchMatches, SearchMatch } from '../common/SearchHighlighter';
import { OptimizedNotesList } from './OptimizedNotesList';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { useReview } from '../../hooks/useReview';
import { ReviewSession } from '../review/ReviewSession';
import { NoteTransformationInterface } from '../review/NoteTransformationInterface';
import { IntegratedChatPanel } from './IntegratedChatPanel';
import { PerformanceDashboard } from './PerformanceDashboard';
import { useSettings } from '../../hooks/useSettings';
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
  
  // Review functionality state
  const [showReviewSession, setShowReviewSession] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [showBulkReviewInterface, setShowBulkReviewInterface] = useState(false);
  const [currentBulkReviewNote, setCurrentBulkReviewNote] = useState<NoteDisplayItem | null>(null);
  
  // Chat functionality state
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  const [chatContextNoteIds, setChatContextNoteIds] = useState<string[]>([]);
  
  // Performance monitoring state
  const [performanceDashboardVisible, setPerformanceDashboardVisible] = useState(false);
  
  // Use review hook for status and session management
  const {
    reviewStatus,
    activeSession,
    isLoading: reviewLoading,
    isReviewRequired,
    reviewCount,
    createReviewSession,
    processNote
  } = useReview({ autoLoad: true });

  // Use settings hook for chat configuration
  const { provider, modelName } = useSettings(true);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when review session completes
  useEffect(() => {
    if (!activeSession && reviewStatus) {
      loadData(); // Refresh notes when review session ends
    }
  }, [activeSession, reviewStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { result } = await performanceMonitor.timeAsyncOperation(
        'load-notes-data',
        async () => {
          const [quickNotesData, permanentNotesData, contextsData] = await Promise.all([
            quickNotesService.list(),
            permanentNotesService.list(),
            contextsService.list()
          ]);
          
          return { quickNotesData, permanentNotesData, contextsData };
        }
      );
      
      setQuickNotes(result.quickNotesData);
      setPermanentNotes(result.permanentNotesData);
      setContexts(result.contextsData);
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
    
    // Get notes requiring review from review status
    const notesRequiringReview = new Set(
      reviewStatus?.notesRequiringReview?.map(note => note.id) || []
    );
    
    const quickDisplayItems: NoteDisplayItem[] = quickNotes.map(note => {
      const titleMatches = findSearchMatches(note.title, searchQuery, 'title');
      const contentMatches = findSearchMatches(note.content, searchQuery, 'content');
      const relevanceScore = calculateRelevanceScore(note.title, note.content, note.tags, searchQuery);
      
      // Determine review status based on actual review service data
      let reviewStatus: 'pending' | 'reviewed' | 'transformed' = 'reviewed';
      if (notesRequiringReview.has(note.id)) {
        reviewStatus = 'pending';
      }
      
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
        reviewStatus,
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
    const { result } = performanceMonitor.timeOperation(
      'filter-and-sort-notes',
      () => {
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
      },
      quickNotes.length + permanentNotes.length
    );

    return result;
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

  // Review functionality handlers
  const handleStartReviewSession = async () => {
    try {
      const session = await createReviewSession();
      if (session) {
        setShowReviewSession(true);
      }
    } catch (err) {
      console.error('Failed to start review session:', err);
    }
  };

  const handleCompleteReviewSession = async () => {
    setShowReviewSession(false);
    await loadData(); // Refresh notes after review
  };

  const handleCancelReviewSession = () => {
    setShowReviewSession(false);
  };

  // Bulk selection handlers
  const handleToggleBulkSelection = () => {
    setBulkSelectionMode(!bulkSelectionMode);
    setSelectedNotes(new Set());
  };

  const handleNoteSelection = (noteId: string, selected: boolean) => {
    const newSelection = new Set(selectedNotes);
    if (selected) {
      newSelection.add(noteId);
    } else {
      newSelection.delete(noteId);
    }
    setSelectedNotes(newSelection);
  };

  const handleSelectAll = () => {
    const allNoteIds = filteredAndSortedNotes
      .filter(note => note.type === 'quick' && note.reviewStatus === 'pending')
      .map(note => note.id);
    setSelectedNotes(new Set(allNoteIds));
  };

  const handleDeselectAll = () => {
    setSelectedNotes(new Set());
  };

  const handleBulkReview = () => {
    const selectedQuickNotes = filteredAndSortedNotes.filter(
      note => selectedNotes.has(note.id) && note.type === 'quick' && note.reviewStatus === 'pending'
    );
    
    if (selectedQuickNotes.length > 0) {
      setCurrentBulkReviewNote(selectedQuickNotes[0]);
      setShowBulkReviewInterface(true);
    }
  };

  const handleBulkReviewNext = () => {
    if (!currentBulkReviewNote) return;
    
    // Remove current note from selection
    const newSelection = new Set(selectedNotes);
    newSelection.delete(currentBulkReviewNote.id);
    setSelectedNotes(newSelection);
    
    // Find next note to review
    const remainingNotes = filteredAndSortedNotes.filter(
      note => newSelection.has(note.id) && note.type === 'quick' && note.reviewStatus === 'pending'
    );
    
    if (remainingNotes.length > 0) {
      setCurrentBulkReviewNote(remainingNotes[0]);
    } else {
      // No more notes to review
      setShowBulkReviewInterface(false);
      setCurrentBulkReviewNote(null);
      setBulkSelectionMode(false);
      loadData(); // Refresh data
    }
  };

  const handleBulkReviewCancel = () => {
    setShowBulkReviewInterface(false);
    setCurrentBulkReviewNote(null);
    setSelectedNotes(new Set());
  };

  // Chat functionality handlers
  const handleToggleChatPanel = () => {
    setChatPanelVisible(!chatPanelVisible);
  };

  const handleChatContextChange = (noteIds: string[]) => {
    setChatContextNoteIds(noteIds);
  };

  // Performance dashboard handlers
  const handleTogglePerformanceDashboard = () => {
    setPerformanceDashboardVisible(!performanceDashboardVisible);
  };

  // Get selected notes for chat context
  const chatContextNotes = useMemo(() => {
    return filteredAndSortedNotes.filter(note => chatContextNoteIds.includes(note.id));
  }, [filteredAndSortedNotes, chatContextNoteIds]);

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
    <div className={`notes-management-panel ${chatPanelVisible ? 'with-chat' : ''}`}>
      <div className="notes-main-content">
        <div className="panel-header">
        <div className="header-top">
          <h1>Notes</h1>
          <div className="header-actions">
            {/* Review Status Indicator */}
            {isReviewRequired && (
              <div className="review-status-indicator">
                <span className="review-badge">
                  {reviewCount} need{reviewCount !== 1 ? '' : 's'} review
                </span>
              </div>
            )}
            
            {/* Review Session Button */}
            {isReviewRequired && !activeSession && (
              <button 
                onClick={handleStartReviewSession} 
                className="review-session-button"
                disabled={reviewLoading}
                title="Start Review Session"
              >
                📝 Start Review
              </button>
            )}
            
            {/* Active Session Indicator */}
            {activeSession && (
              <button 
                onClick={() => setShowReviewSession(true)} 
                className="active-review-button"
                title="Continue Review Session"
              >
                📝 Continue Review ({activeSession.notes.length} remaining)
              </button>
            )}
            
            {/* Bulk Selection Toggle */}
            <button 
              onClick={handleToggleBulkSelection}
              className={`bulk-selection-button ${bulkSelectionMode ? 'active' : ''}`}
              title="Bulk Selection Mode"
            >
              {bulkSelectionMode ? '✓ Bulk Mode' : '☐ Bulk Select'}
            </button>
            
            <button 
              onClick={handleToggleChatPanel}
              className={`chat-toggle-button ${chatPanelVisible ? 'active' : ''}`}
              title="Toggle Chat Panel"
            >
              💬 Chat
            </button>
            
            {/* Performance Dashboard Toggle (Development Mode) */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={handleTogglePerformanceDashboard}
                className={`performance-button ${performanceDashboardVisible ? 'active' : ''}`}
                title="Performance Dashboard"
              >
                📊 Performance
              </button>
            )}
            
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

        {/* Bulk Selection Controls */}
        {bulkSelectionMode && (
          <div className="bulk-selection-controls">
            <div className="bulk-selection-info">
              <span>{selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected</span>
            </div>
            <div className="bulk-selection-actions">
              <button onClick={handleSelectAll} className="bulk-action-button">
                Select All Pending
              </button>
              <button onClick={handleDeselectAll} className="bulk-action-button">
                Deselect All
              </button>
              {selectedNotes.size > 0 && (
                <button 
                  onClick={handleBulkReview} 
                  className="bulk-review-button"
                >
                  Review Selected ({selectedNotes.size})
                </button>
              )}
            </div>
          </div>
        )}

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
        {/* Review Session Interface */}
        {showReviewSession && (
          <div className="review-session-overlay">
            <ReviewSession
              onComplete={handleCompleteReviewSession}
              onCancel={handleCancelReviewSession}
            />
          </div>
        )}

        {/* Bulk Review Interface */}
        {showBulkReviewInterface && currentBulkReviewNote && (
          <div className="bulk-review-overlay">
            <div className="bulk-review-header">
              <h2>Bulk Review ({selectedNotes.size} remaining)</h2>
              <button onClick={handleBulkReviewCancel} className="cancel-bulk-review">
                Cancel
              </button>
            </div>
            <NoteTransformationInterface
              note={{
                id: currentBulkReviewNote.id,
                title: currentBulkReviewNote.title,
                content: currentBulkReviewNote.content,
                tags: currentBulkReviewNote.tags,
                contextId: currentBulkReviewNote.contextId,
                createdAt: currentBulkReviewNote.createdAt.toISOString(),
                lastModified: currentBulkReviewNote.updatedAt.toISOString(),
                isReviewRequired: true
              }}
              onTransform={async (permanentNoteData) => {
                // Process the note transformation
                const success = await processNote(currentBulkReviewNote.id, {
                  action: 'transform',
                  permanentNoteData
                });
                if (success) {
                  handleBulkReviewNext();
                }
              }}
              onDiscard={async () => {
                // Process the note discard
                const success = await processNote(currentBulkReviewNote.id, {
                  action: 'discard'
                });
                if (success) {
                  handleBulkReviewNext();
                }
              }}
              isProcessing={reviewLoading}
            />
          </div>
        )}

        {/* Notes List */}
        {!showReviewSession && !showBulkReviewInterface && (
          <OptimizedNotesList
            notes={filteredAndSortedNotes}
            searchQuery={searchQuery}
            bulkSelectionMode={bulkSelectionMode}
            selectedNotes={selectedNotes}
            onNoteClick={(note) => {
              // TODO: Implement note detail view or editing
              console.log('Note clicked:', note);
            }}
            onSelectionChange={handleNoteSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            containerHeight={600}
            enableVirtualScrolling={filteredAndSortedNotes.length > 100}
            enablePagination={filteredAndSortedNotes.length > 50}
            itemsPerPage={50}
          />
        )}
        </div>
      </div>

      {/* Integrated Chat Panel */}
      <IntegratedChatPanel
        isVisible={chatPanelVisible}
        onToggleVisibility={handleToggleChatPanel}
        selectedNotes={chatContextNotes}
        onNoteContextChange={handleChatContextChange}
        model={provider || 'openai'}
        modelName={modelName}
        embeddingProvider={'openai'}
      />

      {/* Performance Dashboard */}
      <PerformanceDashboard
        isVisible={performanceDashboardVisible}
        onClose={() => setPerformanceDashboardVisible(false)}
        itemCount={quickNotes.length + permanentNotes.length}
      />
    </div>
  );
};

