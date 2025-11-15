import React from 'react';
import './DesktopPanel.css';

export const DesktopNotesPanel: React.FC = () => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Notes</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>Notes Coming Soon</h2>
          <p>Your notes will appear here</p>
        </div>
      </div>
    </div>
  );
};

