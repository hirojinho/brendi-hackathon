import React from 'react';
import './ReviewEmptyState.css';

interface ReviewEmptyStateProps {
  onCancel?: () => void;
  onComplete?: () => void;
}

export const ReviewEmptyState: React.FC<ReviewEmptyStateProps> = ({
  onCancel,
  onComplete
}) => {
  return (
    <div className="review-empty-state">
      <div className="empty-state-content">
        <div className="empty-state-icon">
          ✅
        </div>
        
        <h3>Review Complete!</h3>
        
        <p>
          All notes have been processed. You can now create new quick notes.
        </p>
        
        <div className="empty-state-actions">
          <button 
            onClick={onComplete}
            className="btn-primary"
          >
            Continue Taking Notes
          </button>
          
          {onCancel && (
            <button 
              onClick={onCancel}
              className="btn-secondary"
            >
              Close Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};