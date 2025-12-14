import React from 'react';
import './DesktopPanel.css';

export const MinimalNotesPanel: React.FC = () => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Notes</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>Notes Panel (Minimal Mode)</h2>
          <p>Notes functionality is temporarily simplified to prevent crashes.</p>
          <div style={{ marginTop: '20px' }}>
            <button className="macos-button macos-button--primary macos-button--medium">
              View Notes (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};