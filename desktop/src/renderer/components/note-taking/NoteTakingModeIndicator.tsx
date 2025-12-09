import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextSelector } from '../contexts';
import './NoteTakingModeIndicator.css';

interface NoteTakingModeIndicatorProps {
  selectedContextId: string | null;
  contexts: Context[];
  onContextChange: (contextId: string | null) => void;
  onViewNotes: () => void;
  isLoading: boolean;
}

export const NoteTakingModeIndicator: React.FC<NoteTakingModeIndicatorProps> = ({
  selectedContextId,
  contexts,
  onContextChange,
  onViewNotes,
  isLoading,
}) => {
  return (
    <div className="note-taking-mode-indicator">
      <span className="mode-badge">Note-Taking Agent Mode</span>
      <div className="context-selector-group">
        <label htmlFor="context-select">Source:</label>
        <ContextSelector
          contexts={contexts}
          value={selectedContextId}
          onChange={onContextChange}
          disabled={isLoading}
          placeholder="No Source"
          showNoneOption={true}
          className="context-select"
        />
      </div>
      <button 
        className="view-notes-btn"
        onClick={onViewNotes}
        title="View All Quick Notes"
      >
        View Notes
      </button>
    </div>
  );
};

