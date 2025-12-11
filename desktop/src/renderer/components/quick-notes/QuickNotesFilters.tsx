import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextSelector } from '../contexts';
import './QuickNotesFilters.css';

interface QuickNotesFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedContextId: string | null;
  onContextChange: (contextId: string | null) => void;
  contexts: Context[];
  showContextFilter?: boolean;
}

export const QuickNotesFilters: React.FC<QuickNotesFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedContextId,
  onContextChange,
  contexts,
  showContextFilter = true,
}) => {
  return (
    <div className="quick-notes-filters">
      <div className="quick-notes-search">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
      </div>
      {showContextFilter && (
        <div className="quick-notes-context-filter">
          <ContextSelector
            contexts={contexts}
            value={selectedContextId}
            onChange={(contextId) => {
              if (contextId === 'none') {
                onContextChange('none');
              } else {
                onContextChange(contextId);
              }
            }}
            placeholder="All Sources"
            showNoneOption={true}
            className="context-filter-select"
          />
        </div>
      )}
    </div>
  );
};

