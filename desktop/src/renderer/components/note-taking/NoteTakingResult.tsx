import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextBadge } from '../contexts';
import { getContextName } from '../../utils/contextUtils';
import './NoteTakingResult.css';

interface NoteTakingResultProps {
  result: {
    shouldCreateNote: boolean;
    contextId?: string | null;
    reasoning: string;
    notes: Array<{ id: string; title: string; content: string; tags: string[] }>;
  };
  contexts: Context[];
  onClear: () => void;
}

export const NoteTakingResult: React.FC<NoteTakingResultProps> = ({
  result,
  contexts,
  onClear,
}) => {
  const contextName = result.contextId ? getContextName(contexts, result.contextId) : null;

  return (
    <div className={`note-taking-result ${result.shouldCreateNote ? 'success' : 'info'}`}>
      <div className="result-header">
        <strong>{result.shouldCreateNote ? '✓ Note Created' : 'ℹ No Note Created'}</strong>
        {result.contextId && contextName && (
          <ContextBadge contexts={contexts} contextId={result.contextId} className="result-context-badge" />
        )}
      </div>
      <div className="result-reasoning">{result.reasoning}</div>
      {result.notes.length > 0 && (
        <div className="result-notes">
          {result.notes.map((note, idx) => (
            <div key={idx} className="result-note-item">
              <div className="result-note-title">{note.title}</div>
              <div className="result-note-content">{note.content}</div>
              <div className="result-note-tags">
                {note.tags.map((tag, tagIdx) => (
                  <span key={tagIdx} className="result-tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="clear-result-btn" onClick={onClear}>Clear</button>
    </div>
  );
};

