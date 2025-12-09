import React from 'react';
import type { Context } from '../../services/contextsService';
import { ContextTree } from '../contexts';
import './SourcesManagementPanel.css';

interface SourcesManagementPanelProps {
  contexts: Context[];
  notes: Array<{ contextId: string | null }>;
  onDeleteContext: (id: string) => void;
}

export const SourcesManagementPanel: React.FC<SourcesManagementPanelProps> = ({
  contexts,
  notes,
  onDeleteContext,
}) => {
  return (
    <div className="sources-management">
      <h3>Sources</h3>
      {contexts.length === 0 ? (
        <p className="no-sources">
          No sources yet. Sources will be created automatically when you take notes.
        </p>
      ) : (
        <ContextTree
          contexts={contexts}
          notes={notes}
          onDelete={onDeleteContext}
        />
      )}
    </div>
  );
};

