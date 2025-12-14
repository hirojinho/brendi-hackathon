import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Context } from '../../services/contextsService';
import './SearchAndFilterBar.css';

export interface NoteFilters {
  noteType: 'all' | 'quick' | 'permanent';
  contextIds: string[];
  tags: string[];
  dateRange: DateRange | null;
  reviewStatus: ReviewStatus[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type ReviewStatus = 'pending' | 'reviewed' | 'transformed';

export interface SortOption {
  field: 'createdAt' | 'updatedAt' | 'title' | 'relevance';
  direction: 'asc' | 'desc';
}

export interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: NoteFilters;
  onFilterChange: (filters: NoteFilters) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: (show: boolean) => void;
  contexts: Context[];
  availableTags: string[];
  totalNotesCount: number;
  filteredNotesCount: number;
}

export const SearchAndFilterBar = React.forwardRef<HTMLInputElement, SearchAndFilterBarProps>(({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  contexts,
  availableTags,
  totalNotesCount,
  filteredNotesCount
}, ref) => {
  const [searchInputValue, setSearchInputValue] = useState(searchQuery);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Real-time search with debouncing
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      onSearchChange(searchInputValue);
    }, 300); // 300ms debounce

    setDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchInputValue, onSearchChange]);

  // Update local search value when prop changes (for external updates)
  useEffect(() => {
    setSearchInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInputValue('');
    onSearchChange('');
  }, [onSearchChange]);

  const handleNoteTypeChange = useCallback((noteType: NoteFilters['noteType']) => {
    onFilterChange({ ...filters, noteType });
  }, [filters, onFilterChange]);

  const handleContextToggle = useCallback((contextId: string) => {
    const newContextIds = filters.contextIds.includes(contextId)
      ? filters.contextIds.filter(id => id !== contextId)
      : [...filters.contextIds, contextId];
    onFilterChange({ ...filters, contextIds: newContextIds });
  }, [filters, onFilterChange]);

  const handleTagToggle = useCallback((tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  }, [filters, onFilterChange]);

  const handleReviewStatusToggle = useCallback((status: ReviewStatus) => {
    const newStatuses = filters.reviewStatus.includes(status)
      ? filters.reviewStatus.filter(s => s !== status)
      : [...filters.reviewStatus, status];
    onFilterChange({ ...filters, reviewStatus: newStatuses });
  }, [filters, onFilterChange]);

  const handleDateRangeChange = useCallback((field: 'start' | 'end', value: string) => {
    if (!value) {
      if (field === 'start' && filters.dateRange?.end) {
        onFilterChange({ ...filters, dateRange: null });
      } else if (field === 'end' && filters.dateRange?.start) {
        onFilterChange({ ...filters, dateRange: null });
      }
      return;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return;

    const currentRange = filters.dateRange;
    let newRange: DateRange;

    if (field === 'start') {
      newRange = {
        start: date,
        end: currentRange?.end || new Date()
      };
    } else {
      newRange = {
        start: currentRange?.start || new Date(0),
        end: date
      };
    }

    onFilterChange({ ...filters, dateRange: newRange });
  }, [filters, onFilterChange]);

  const handleSortFieldChange = useCallback((field: SortOption['field']) => {
    onSortChange({ ...sortBy, field });
  }, [sortBy, onSortChange]);

  const handleSortDirectionToggle = useCallback(() => {
    onSortChange({ 
      ...sortBy, 
      direction: sortBy.direction === 'asc' ? 'desc' : 'asc' 
    });
  }, [sortBy, onSortChange]);

  const handleClearAllFilters = useCallback(() => {
    onFilterChange({
      noteType: 'all',
      contextIds: [],
      tags: [],
      dateRange: null,
      reviewStatus: []
    });
    setSearchInputValue('');
    onSearchChange('');
  }, [onFilterChange, onSearchChange]);

  const hasActiveFilters = useMemo(() => {
    return filters.noteType !== 'all' ||
           filters.contextIds.length > 0 ||
           filters.tags.length > 0 ||
           filters.dateRange !== null ||
           filters.reviewStatus.length > 0 ||
           searchQuery.trim().length > 0;
  }, [filters, searchQuery]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="search-and-filter-bar" role="search" aria-label="Search and filter notes">
      {/* Main Search Row */}
      <div className="search-row">
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <label htmlFor="notes-search" className="sr-only">
              Search notes by title, content, or tags
            </label>
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              ref={ref}
              id="notes-search"
              type="text"
              placeholder="Search notes by title, content, or tags..."
              value={searchInputValue}
              onChange={handleSearchInputChange}
              className="search-input keyboard-focusable"
              autoComplete="off"
              aria-describedby="search-help"
              aria-label="Search notes"
            />
            {searchInputValue && (
              <button
                onClick={handleClearSearch}
                className="clear-search-button keyboard-focusable"
                title="Clear search"
                aria-label="Clear search query"
              >
                <span aria-hidden="true">✕</span>
              </button>
            )}
          </div>
        </div>

        <div className="search-controls" role="group" aria-label="Search controls">
          <button
            onClick={() => onToggleAdvancedFilters(!showAdvancedFilters)}
            className={`advanced-filters-toggle ${showAdvancedFilters ? 'active' : ''} keyboard-focusable`}
            title="Toggle advanced filters"
            aria-label={showAdvancedFilters ? 'Hide advanced filters' : 'Show advanced filters'}
            aria-expanded={showAdvancedFilters}
            aria-controls="advanced-filters-panel"
          >
            <span className="filter-icon" aria-hidden="true">⚙️</span>
            Filters
            {hasActiveFilters && <span className="active-indicator" aria-label="Active filters">●</span>}
          </button>

          <div className="sort-controls" role="group" aria-label="Sort controls">
            <label htmlFor="sort-field" className="sr-only">Sort notes by</label>
            <select
              id="sort-field"
              value={sortBy.field}
              onChange={(e) => handleSortFieldChange(e.target.value as SortOption['field'])}
              className="sort-field-select keyboard-focusable"
              title="Sort by"
              aria-label="Sort notes by"
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Modified Date</option>
              <option value="title">Title</option>
              <option value="relevance">Relevance</option>
            </select>
            
            <button
              onClick={handleSortDirectionToggle}
              className="sort-direction-button keyboard-focusable"
              title={`Sort ${sortBy.direction === 'asc' ? 'Descending' : 'Ascending'}`}
              aria-label={`Sort ${sortBy.direction === 'asc' ? 'ascending' : 'descending'}, click to change to ${sortBy.direction === 'asc' ? 'descending' : 'ascending'}`}
            >
              <span aria-hidden="true">{sortBy.direction === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="results-summary" role="status" aria-live="polite">
        <span className="results-count" aria-label={`Showing ${filteredNotesCount} of ${totalNotesCount} notes`}>
          {filteredNotesCount === totalNotesCount 
            ? `${totalNotesCount} notes`
            : `${filteredNotesCount} of ${totalNotesCount} notes`
          }
        </span>
        {hasActiveFilters && (
          <button
            onClick={handleClearAllFilters}
            className="clear-filters-button keyboard-focusable"
            aria-label="Clear all active filters"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Hidden help text */}
      <div className="sr-only">
        <div id="search-help">
          Type to search notes in real-time. Use filters to narrow results by type, context, tags, or date.
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="advanced-filters-panel" id="advanced-filters-panel" role="region" aria-label="Advanced filters">
          {/* Note Type Filter */}
          <fieldset className="filter-section">
            <legend className="filter-label">Note Type</legend>
            <div className="filter-options" role="radiogroup" aria-label="Note type filter">
              {(['all', 'quick', 'permanent'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleNoteTypeChange(type)}
                  className={`filter-option ${filters.noteType === type ? 'active' : ''} keyboard-focusable`}
                  role="radio"
                  aria-checked={filters.noteType === type}
                  aria-label={type === 'all' ? 'All Notes' : 
                             type === 'quick' ? 'Quick Notes' : 'Permanent Notes'}
                >
                  {type === 'all' ? 'All Notes' : 
                   type === 'quick' ? 'Quick Notes' : 'Permanent Notes'}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Context Filter */}
          {contexts.length > 0 && (
            <div className="filter-section">
              <label className="filter-label">Contexts</label>
              <div className="filter-options context-options">
                {contexts.map(context => (
                  <button
                    key={context.id}
                    onClick={() => handleContextToggle(context.id)}
                    className={`filter-option ${filters.contextIds.includes(context.id) ? 'active' : ''}`}
                    title={context.description}
                  >
                    {context.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="filter-section">
              <label className="filter-label">Tags</label>
              <div className="filter-options tag-options">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`filter-option tag-option ${filters.tags.includes(tag) ? 'active' : ''}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Review Status Filter */}
          <div className="filter-section">
            <label className="filter-label">Review Status</label>
            <div className="filter-options">
              {(['pending', 'reviewed', 'transformed'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => handleReviewStatusToggle(status)}
                  className={`filter-option ${filters.reviewStatus.includes(status) ? 'active' : ''}`}
                >
                  {status === 'pending' ? 'Needs Review' :
                   status === 'reviewed' ? 'Reviewed' : 'Transformed'}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="filter-section">
            <label className="filter-label">Date Range</label>
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label htmlFor="date-start" className="date-label">From</label>
                <input
                  id="date-start"
                  type="date"
                  value={filters.dateRange?.start ? formatDateForInput(filters.dateRange.start) : ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label htmlFor="date-end" className="date-label">To</label>
                <input
                  id="date-end"
                  type="date"
                  value={filters.dateRange?.end ? formatDateForInput(filters.dateRange.end) : ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SearchAndFilterBar.displayName = 'SearchAndFilterBar';