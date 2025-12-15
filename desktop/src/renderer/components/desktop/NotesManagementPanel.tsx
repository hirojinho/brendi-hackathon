import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SearchAndFilterBar, NoteFilters, SortOption } from './SearchAndFilterBar';
import { calculateRelevanceScore, findSearchMatches, SearchMatch } from '../common/SearchHighlighter';
import { OptimizedNotesList } from './OptimizedNotesList';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { useReviewStatus } from '../../features/review/hooks/useReviewStatus';
import { useQuickNotes } from '../../features/notes/hooks/useQuickNotes';
import { usePermanentNotes } from '../../features/notes/hooks/usePermanentNotes';
import { useContexts } from '../../features/contexts/hooks/useContexts';
import type { QuickNote as QuickNoteData } from '../../services/quickNotesService';
import type { PermanentNote as PermanentNoteData } from '../../services/permanentNotesService';
import type { Context as ContextData } from '../../services/contextsService';
import { ReviewSessionContainer } from '../../features/review/components/ReviewSessionContainer';
import { NoteTransformationInterface } from '../review/NoteTransformationInterface';
import { IntegratedChatPanel } from './IntegratedChatPanel';
import { PerformanceDashboard } from './PerformanceDashboard';
import { useSettings } from '../../hooks/useSettings';
import { useSystemPreferences } from '../../hooks/useSystemPreferences';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useNotificationHelpers } from '../common/NotificationSystem';
import { LoadingState, LoadingOverlay } from '../common/LoadingState';
import { FadeTransition, SlideTransition } from '../common/Transitions';
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
  console.log('[NotesManagementPanel] Component rendering');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('unified');
  
  // Use new feature hooks
  const { notes: quickNotesData, isLoading: quickNotesLoading, loadNotes: loadQuickNotes } = useQuickNotes({ autoLoad: true });
  const { notes: permanentNotesData, isLoading: permanentNotesLoading, loadNotes: loadPermanentNotes } = usePermanentNotes({ autoLoad: true });
  const { contexts: contextsData, isLoading: contextsLoading, loadContexts } = useContexts({ autoLoad: true, hierarchy: true });
  const { status: reviewStatus, isLoading: reviewStatusLoading } = useReviewStatus({ autoLoad: true });
  
  // Convert domain models to display format (for backward compatibility)
  const quickNotes: QuickNoteData[] = quickNotesData.map(note => note.toData());
  const permanentNotes: PermanentNoteData[] = permanentNotesData.map(note => note.toData());
  const contexts: ContextData[] = contextsData.map(ctx => ctx.toData());
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
  
  // Review status from new hook
  const isReviewRequired = reviewStatus?.isReviewRequired || false;
  const reviewCount = reviewStatus?.reviewCount || 0;

  // Use settings hook for chat configuration
  const { provider, modelName } = useSettings(true);

  // Use system preferences for accessibility
  const systemPreferences = useSystemPreferences();

  // Use notification helpers for user feedback
  const { showSuccess, showError, showInfo } = useNotificationHelpers();

  // Refs for keyboard navigation
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Loading state from hooks
  const isLoading = quickNotesLoading || permanentNotesLoading || contextsLoading || reviewStatusLoading;

  // Refresh data when review session completes
  useEffect(() => {
    if (reviewStatus && !reviewStatus.activeSession) {
      // Refresh notes when review session ends
      loadQuickNotes();
      loadPermanentNotes();
      loadContexts();
    }
  }, [reviewStatus?.activeSession, loadQuickNotes, loadPermanentNotes, loadContexts]);

  const loadData = async () => {
    try {
      setError(null);
      await Promise.all([
        loadQuickNotes(),
        loadPermanentNotes(),
        loadContexts()
      ]);
      
      // Show success notification for large data loads
      const totalNotes = quickNotes.length + permanentNotes.length;
      if (totalNotes > 100) {
        showSuccess(
          'Notes loaded successfully',
          `Loaded ${totalNotes} notes`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
      showError('Failed to load notes', errorMessage);
    }
  };

  // Convert notes to unified display format
  const convertToDisplayItems = (
    quickNotes: QuickNoteData[], 
    permanentNotes: PermanentNoteData[], 
    contexts: ContextData[],
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
      // The ReviewSessionContainer will handle session creation automatically
      setShowReviewSession(true);
      if (reviewStatus?.reviewCount) {
        showInfo('Review session started', `${reviewStatus.reviewCount} notes ready for review`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start review session';
      console.error('Failed to start review session:', err);
      showError('Review session failed', errorMessage);
    }
  };

  const handleCompleteReviewSession = async () => {
    setShowReviewSession(false);
    showSuccess('Review session completed', 'Notes have been updated');
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

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Global keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'f':
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case 'r':
          e.preventDefault();
          loadData();
          break;
        case 'n':
          e.preventDefault();
          // TODO: Implement new note creation
          break;
        case 'Enter':
          if (e.shiftKey && isReviewRequired && !reviewStatus?.activeSession) {
            e.preventDefault();
            handleStartReviewSession();
          }
          break;
      }
    }

    // Escape key handling
    if (e.key === 'Escape') {
      if (showReviewSession) {
        handleCancelReviewSession();
      } else if (showBulkReviewInterface) {
        handleBulkReviewCancel();
      } else if (bulkSelectionMode) {
        handleToggleBulkSelection();
      } else if (chatPanelVisible) {
        handleToggleChatPanel();
      }
    }
  }, [isReviewRequired, reviewStatus?.activeSession, showReviewSession, showBulkReviewInterface, bulkSelectionMode, chatPanelVisible]);

  // Announce status changes to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    if (systemPreferences.voiceOverEnabled) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }, [systemPreferences.voiceOverEnabled]);

  // Announce data loading status
  useEffect(() => {
    if (!isLoading && !error) {
      announceToScreenReader(`Loaded ${filteredAndSortedNotes.length} notes`);
    } else if (error) {
      announceToScreenReader(`Error loading notes: ${error}`);
    }
  }, [isLoading, error, filteredAndSortedNotes.length, announceToScreenReader]);

  if (isLoading) {
    console.log('[NotesManagementPanel] Rendering loading state');
    return (
      <div className="notes-management-panel">
        <LoadingState 
          message="Loading notes..." 
          size="large"
          variant="spinner"
        />
      </div>
    );
  }

  if (error) {
    console.log('[NotesManagementPanel] Rendering error state:', error);
    return (
      <div className="notes-management-panel">
        <ErrorBoundary
          fallback={
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h2>Error Loading Notes</h2>
              <p>{error}</p>
              <button onClick={loadData} className="macos-button macos-button--primary macos-button--medium">
                Try Again
              </button>
            </div>
          }
        >
          <div>Error occurred</div>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div 
      className={`notes-management-panel ${chatPanelVisible ? 'with-chat' : ''}`}
      ref={panelRef}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Notes Management"
    >
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="status-announcements">
        {isLoading && "Loading notes..."}
        {error && `Error: ${error}`}
      </div>

      <div className="notes-main-content" id="main-content">
        <div className="panel-header">
        <div className="header-top">
          <h1 id="page-title">Notes</h1>
          <div className="header-actions" role="toolbar" aria-label="Notes actions">
            {/* Review Status Indicator */}
            {isReviewRequired && (
              <div className="review-status-indicator" role="status" aria-live="polite">
                <span 
                  className="review-badge"
                  aria-label={`${reviewCount} note${reviewCount !== 1 ? 's' : ''} need${reviewCount === 1 ? 's' : ''} review`}
                >
                  {reviewCount} need{reviewCount !== 1 ? '' : 's'} review
                </span>
              </div>
            )}
            
            {/* Review Session Button */}
            {isReviewRequired && !reviewStatus?.activeSession && (
              <button 
                onClick={handleStartReviewSession} 
                className="review-session-button touch-target keyboard-focusable"
                disabled={reviewStatusLoading}
                title="Start Review Session"
                aria-label={`Start review session for ${reviewCount} notes`}
                aria-describedby="review-help"
              >
                <span aria-hidden="true">📝</span> Start Review
              </button>
            )}
            
            {/* Active Session Indicator */}
            {reviewStatus?.activeSession && (
              <button 
                onClick={() => setShowReviewSession(true)} 
                className="active-review-button touch-target keyboard-focusable"
                title="Continue Review Session"
                aria-label={`Continue review session, ${reviewStatus.activeSession.quickNoteIds.length} notes remaining`}
              >
                <span aria-hidden="true">📝</span> Continue Review ({reviewStatus.activeSession.quickNoteIds.length} remaining)
              </button>
            )}
            
            {/* Bulk Selection Toggle */}
            <button 
              onClick={handleToggleBulkSelection}
              className={`bulk-selection-button ${bulkSelectionMode ? 'active' : ''} touch-target keyboard-focusable`}
              title="Bulk Selection Mode"
              aria-label={bulkSelectionMode ? 'Exit bulk selection mode' : 'Enter bulk selection mode'}
              aria-pressed={bulkSelectionMode}
            >
              <span aria-hidden="true">{bulkSelectionMode ? '✓' : '☐'}</span> 
              {bulkSelectionMode ? 'Bulk Mode' : 'Bulk Select'}
            </button>
            
            <button 
              onClick={handleToggleChatPanel}
              className={`chat-toggle-button ${chatPanelVisible ? 'active' : ''} touch-target keyboard-focusable`}
              title="Toggle Chat Panel"
              aria-label={chatPanelVisible ? 'Close chat panel' : 'Open chat panel'}
              aria-pressed={chatPanelVisible}
              aria-expanded={chatPanelVisible}
            >
              <span aria-hidden="true">💬</span> Chat
            </button>
            
            {/* Performance Dashboard Toggle (Development Mode) */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={handleTogglePerformanceDashboard}
                className={`performance-button ${performanceDashboardVisible ? 'active' : ''} touch-target keyboard-focusable`}
                title="Performance Dashboard"
                aria-label={performanceDashboardVisible ? 'Close performance dashboard' : 'Open performance dashboard'}
                aria-pressed={performanceDashboardVisible}
              >
                <span aria-hidden="true">📊</span> Performance
              </button>
            )}
            
            <button 
              onClick={loadData} 
              className="refresh-button touch-target keyboard-focusable" 
              title="Refresh notes"
              aria-label="Refresh notes list"
            >
              <span aria-hidden="true">🔄</span>
              <span className="sr-only">Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Mode Switcher */}
        <div className="mode-switcher" role="tablist" aria-label="Note display modes">
          <button
            className={`mode-button ${displayMode === 'unified' ? 'active' : ''} keyboard-focusable`}
            onClick={() => setDisplayMode('unified')}
            role="tab"
            aria-selected={displayMode === 'unified'}
            aria-controls="notes-content"
            id="tab-unified"
          >
            All Notes
          </button>
          <button
            className={`mode-button ${displayMode === 'quick-only' ? 'active' : ''} keyboard-focusable`}
            onClick={() => setDisplayMode('quick-only')}
            role="tab"
            aria-selected={displayMode === 'quick-only'}
            aria-controls="notes-content"
            id="tab-quick"
          >
            Quick Notes
          </button>
          <button
            className={`mode-button ${displayMode === 'permanent-only' ? 'active' : ''} keyboard-focusable`}
            onClick={() => setDisplayMode('permanent-only')}
            role="tab"
            aria-selected={displayMode === 'permanent-only'}
            aria-controls="notes-content"
            id="tab-permanent"
          >
            Permanent Notes
          </button>
        </div>

        {/* Bulk Selection Controls */}
        {bulkSelectionMode && (
          <div className="bulk-selection-controls" role="region" aria-label="Bulk selection controls">
            <div className="bulk-selection-info">
              <span aria-live="polite" aria-atomic="true">
                {selectedNotes.size} note{selectedNotes.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="bulk-selection-actions" role="group" aria-label="Bulk actions">
              <button 
                onClick={handleSelectAll} 
                className="bulk-action-button keyboard-focusable"
                aria-label="Select all pending notes"
              >
                Select All Pending
              </button>
              <button 
                onClick={handleDeselectAll} 
                className="bulk-action-button keyboard-focusable"
                aria-label="Deselect all notes"
              >
                Deselect All
              </button>
              {selectedNotes.size > 0 && (
                <button 
                  onClick={handleBulkReview} 
                  className="bulk-review-button keyboard-focusable"
                  aria-label={`Review ${selectedNotes.size} selected notes`}
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
          ref={searchRef}
        />
      </div>

      <div className="panel-content" id="notes-content" role="tabpanel" aria-labelledby={`tab-${displayMode}`}>
        {/* Review Session Interface */}
        <FadeTransition isVisible={showReviewSession} duration={300}>
          <div 
            className="review-session-overlay" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="review-session-title"
          >
            <ReviewSessionContainer
              onComplete={handleCompleteReviewSession}
              onCancel={handleCancelReviewSession}
            />
          </div>
        </FadeTransition>

        {/* Bulk Review Interface */}
        <SlideTransition isVisible={showBulkReviewInterface && !!currentBulkReviewNote} direction="up" duration={300}>
          <div 
            className="bulk-review-overlay" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="bulk-review-title"
          >
            <div className="bulk-review-header">
              <h2 id="bulk-review-title">Bulk Review ({selectedNotes.size} remaining)</h2>
              <button 
                onClick={handleBulkReviewCancel} 
                className="cancel-bulk-review keyboard-focusable macos-button macos-button--secondary macos-button--small"
                aria-label="Cancel bulk review"
              >
                Cancel
              </button>
            </div>
            {currentBulkReviewNote && (
              <LoadingOverlay isVisible={false} message="Processing note...">
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
                    try {
                      // For bulk review, we need to create a session first or use direct transformation
                      // For now, we'll use the permanent notes service directly
                      const { permanentNotesService } = await import('../../services/permanentNotesService');
                      await permanentNotesService.create({
                        title: permanentNoteData.title || currentBulkReviewNote.title,
                        content: permanentNoteData.content || currentBulkReviewNote.content,
                        tags: permanentNoteData.tags || currentBulkReviewNote.tags,
                        sourceQuickNoteId: currentBulkReviewNote.id
                      });
                      // Delete the quick note
                      const { quickNotesService } = await import('../../services/quickNotesService');
                      await quickNotesService.delete(currentBulkReviewNote.id);
                      showSuccess('Note transformed', 'Note has been converted to permanent note');
                      handleBulkReviewNext();
                      loadQuickNotes();
                      loadPermanentNotes();
                    } catch (err) {
                      showError('Transform failed', err instanceof Error ? err.message : 'Failed to transform note');
                    }
                  }}
                  onDiscard={async () => {
                    try {
                      const { quickNotesService } = await import('../../services/quickNotesService');
                      await quickNotesService.delete(currentBulkReviewNote.id);
                      showInfo('Note discarded', 'Note has been removed');
                      handleBulkReviewNext();
                      loadQuickNotes();
                    } catch (err) {
                      showError('Discard failed', err instanceof Error ? err.message : 'Failed to discard note');
                    }
                  }}
                  isProcessing={false}
                />
              </LoadingOverlay>
            )}
          </div>
        </SlideTransition>

        {/* Notes List */}
        <FadeTransition isVisible={!showReviewSession && !showBulkReviewInterface} duration={200}>
          <ErrorBoundary
            fallback={
              <div className="notes-list-error">
                <p>Failed to load notes list. Please try refreshing.</p>
                <button onClick={loadData} className="macos-button macos-button--primary macos-button--medium">
                  Refresh
                </button>
              </div>
            }
          >
            <OptimizedNotesList
              notes={filteredAndSortedNotes}
              searchQuery={searchQuery}
              bulkSelectionMode={bulkSelectionMode}
              selectedNotes={selectedNotes}
              onNoteClick={(note) => {
                showInfo('Note selected', `Opened note: ${note.title}`);
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
          </ErrorBoundary>
        </FadeTransition>
        </div>
      </div>

      {/* Hidden help text for screen readers */}
      <div className="sr-only">
        <div id="review-help">
          Press Shift+Cmd+Enter to start a review session. Use Escape to cancel operations.
        </div>
        <div id="keyboard-help">
          Keyboard shortcuts: Cmd+F to search, Cmd+R to refresh, Cmd+N for new note, Escape to cancel.
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

