import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextSelector } from '../contexts';
import './NoteTakingModeIndicator.css';

interface NoteTakingModeIndicatorProps {
  selectedContextId: string | null;
  contexts: Context[];
  onContextChange: (contextId: string | null) => void;
  onViewNotes: () => void;
  onStartReview?: () => void;
  isLoading: boolean;
  isReviewRequired?: boolean;
  reviewCount?: number;
}

export const NoteTakingModeIndicator: React.FC<NoteTakingModeIndicatorProps> = ({
  selectedContextId,
  contexts,
  onContextChange,
  onViewNotes,
  onStartReview,
  isLoading,
  isReviewRequired = false,
  reviewCount = 0,
}) => {
  return (
    <div className="note-taking-mode-indicator">
      <div className="mode-header">
        <span className="mode-badge">Note-Taking Agent Mode</span>
        {isReviewRequired && (
          <span className="review-required-badge">
            Review Required ({reviewCount} notes)
          </span>
        )}
      </div>
      
      <div className="mode-controls">
        <div className="context-selector-group">
          <label htmlFor="context-select">Source:</label>
          <ContextSelector
            contexts={contexts}
            value={selectedContextId}
            onChange={onContextChange}
            disabled={isLoading || isReviewRequired}
            placeholder="No Source"
            showNoneOption={true}
            className="context-select"
          />
        </div>
        
        <div className="action-buttons">
          {isReviewRequired && onStartReview && (
            <button 
              className="review-btn"
              onClick={onStartReview}
              title="Start Review Session"
            >
              Start Review
            </button>
          )}
          
          <button 
            className="view-notes-btn"
            onClick={onViewNotes}
            title="View All Quick Notes"
          >
            View Notes
          </button>
        </div>
      </div>
    </div>
  );
};

