import React from 'react';
import './DesktopPanel.css';

export const DesktopZettelkastenPanel: React.FC = () => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Zettelkasten</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <h2>Zettelkasten View Coming Soon</h2>
          <p>Your connected notes will appear here</p>
        </div>
      </div>
    </div>
  );
};

