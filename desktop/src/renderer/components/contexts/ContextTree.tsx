import React from 'react';
import type { Context } from '../../services/contextsService';
import { countNotesForContext } from '../../utils/contextUtils';
import './ContextTree.css';

interface ContextTreeProps {
  contexts: Context[];
  notes: Array<{ contextId: string | null }>;
  onDelete?: (contextId: string) => void;
  renderContext?: (context: Context, notesCount: number, depth: number) => React.ReactNode;
}

export const ContextTree: React.FC<ContextTreeProps> = ({
  contexts,
  notes,
  onDelete,
  renderContext,
}) => {
  const renderContextNode = (context: Context, depth: number = 0): React.ReactNode => {
    const notesCount = countNotesForContext(context.id, contexts, notes);
    const hasChildren = context.children && context.children.length > 0;

    if (renderContext) {
      return renderContext(context, notesCount, depth);
    }

    return (
      <div key={context.id} className="context-tree-node" style={{ marginLeft: `${depth * 20}px` }}>
        <div className="context-tree-info">
          <div className="context-tree-name">
            {hasChildren && '📁 '}
            {context.name}
          </div>
          {context.description && (
            <div className="context-tree-description">{context.description}</div>
          )}
          <div className="context-tree-stats">
            {notesCount} note{notesCount !== 1 ? 's' : ''}
          </div>
        </div>
        {onDelete && (
          <button
            className="context-tree-delete"
            onClick={() => onDelete(context.id)}
            title="Delete Source"
          >
            🗑️
          </button>
        )}
        {hasChildren && (
          <div className="context-tree-children">
            {context.children!.map(child => renderContextNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="context-tree">
      {contexts.map(context => renderContextNode(context))}
    </div>
  );
};

