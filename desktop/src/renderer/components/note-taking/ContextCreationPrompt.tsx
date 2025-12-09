import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextSelector } from '../contexts';
import './ContextCreationPrompt.css';

interface ContextCreationPromptProps {
  pendingContext: {
    name: string;
    description?: string;
    parentId?: string | null;
  };
  contexts: Context[];
  onContextChange: (updates: { parentId?: string | null }) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export const ContextCreationPrompt: React.FC<ContextCreationPromptProps> = ({
  pendingContext,
  contexts,
  onContextChange,
  onCreate,
  onCancel,
}) => {
  return (
    <div className="context-creation-prompt">
      <div className="context-creation-header">
        <strong>Create New Source?</strong>
      </div>
      <div className="context-creation-details">
        <p><strong>Source Name:</strong> {pendingContext.name}</p>
        {pendingContext.description && (
          <p><strong>Description:</strong> {pendingContext.description}</p>
        )}
        <div className="context-creation-parent">
          <label htmlFor="parent-context-select">Parent Source (optional):</label>
          <ContextSelector
            contexts={contexts}
            value={pendingContext.parentId}
            onChange={(parentId) => onContextChange({ parentId })}
            placeholder="No Parent (Top Level)"
            showNoneOption={true}
            className="parent-context-select"
          />
        </div>
        <p className="context-creation-hint">
          This will organize notes by where they came from (conference, book, presentation, etc.)
        </p>
      </div>
      <div className="context-creation-actions">
        <button onClick={onCreate} className="create-context-btn">Create Source</button>
        <button onClick={onCancel} className="cancel-context-btn">Skip</button>
      </div>
    </div>
  );
};

