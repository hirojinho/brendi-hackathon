import React from 'react';
import { useQuickNotesStatus } from '../../hooks/useQuickNotesStatus';
import './QuickNotesStatusIndicator.css';

interface QuickNotesStatusIndicatorProps {
  onReload?: () => void;
}

export const QuickNotesStatusIndicator: React.FC<QuickNotesStatusIndicatorProps> = ({ onReload }) => {
  const { status, isLoading, error } = useQuickNotesStatus();

  if (isLoading || error || !status) {
    return null; // Don't show anything if loading or error
  }

  const getStatusColor = () => {
    if (status.isReviewRequired) return 'warning';
    if (status.isAtLimit) return 'danger';
    if (status.remainingSlots <= 2) return 'caution';
    return 'normal';
  };

  const getStatusMessage = () => {
    if (status.isReviewRequired) {
      return `Review required: ${status.notesRequiringReviewCount} note${status.notesRequiringReviewCount !== 1 ? 's' : ''} need review`;
    }
    if (status.isAtLimit) {
      return `Note limit reached (${status.currentCount}/${status.maxQuickNotes})`;
    }
    return `${status.currentCount}/${status.maxQuickNotes} notes`;
  };

  return (
    <div className={`quick-notes-status-indicator ${getStatusColor()}`}>
      <div className="status-text">
        {getStatusMessage()}
      </div>
      {status.remainingSlots > 0 && !status.isReviewRequired && (
        <div className="remaining-slots">
          {status.remainingSlots} slot{status.remainingSlots !== 1 ? 's' : ''} remaining
        </div>
      )}
    </div>
  );
};