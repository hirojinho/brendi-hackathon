import React from 'react';
import './QuickNotesHeader.css';

interface QuickNotesHeaderProps {
  onBack?: () => void;
  viewMode: 'list' | 'graph';
  onViewModeChange: (mode: 'list' | 'graph') => void;
  showSourcesManagement: boolean;
  onToggleSourcesManagement: () => void;
}

export const QuickNotesHeader: React.FC<QuickNotesHeaderProps> = ({
  onBack,
  viewMode,
  onViewModeChange,
  showSourcesManagement,
  onToggleSourcesManagement,
}) => {
  return (
    <div className="quick-notes-header">
      <div className="quick-notes-title-row">
        {onBack && (
          <button onClick={onBack} className="back-btn" title="Back to Note-Taking">
            ← Back
          </button>
        )}
        <h2>Quick Notes</h2>
        <div className="header-actions-group">
          <div className="view-toggle">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => onViewModeChange('list')}
              title="List View"
            >
              📋 List
            </button>
            <button
              className={viewMode === 'graph' ? 'active' : ''}
              onClick={() => onViewModeChange('graph')}
              title="Drawer View"
            >
              📁 Drawer
            </button>
          </div>
          <button 
            className="manage-sources-btn"
            onClick={onToggleSourcesManagement}
            title="Manage Sources"
          >
            {showSourcesManagement ? 'Hide Sources' : 'Manage Sources'}
          </button>
        </div>
      </div>
    </div>
  );
};

