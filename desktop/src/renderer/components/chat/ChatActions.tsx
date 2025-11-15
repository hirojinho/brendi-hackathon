import React from 'react';

interface ChatActionsProps {
  onSaveAsNote: () => void;
  isLoading: boolean;
}

export const ChatActions: React.FC<ChatActionsProps> = ({ onSaveAsNote, isLoading }) => {
  return (
    <div className="chat-actions">
      <button
        onClick={onSaveAsNote}
        disabled={isLoading}
        className="save-note-btn"
      >
        Save as Note
      </button>
    </div>
  );
};

