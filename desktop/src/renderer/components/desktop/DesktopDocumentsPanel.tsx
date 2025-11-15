import React from 'react';
import './DesktopPanel.css';

interface DesktopDocumentsPanelProps {
  embeddingProvider: 'openai' | 'ollama';
}

export const DesktopDocumentsPanel: React.FC<DesktopDocumentsPanelProps> = () => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Documents</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h2>Documents Coming Soon</h2>
          <p>Your uploaded documents will appear here</p>
        </div>
      </div>
    </div>
  );
};

