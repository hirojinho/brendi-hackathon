import React from 'react';
import './DesktopPanel.css';

interface DesktopReviewPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
}

export const DesktopReviewPanel: React.FC<DesktopReviewPanelProps> = () => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Review</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Review Session Coming Soon</h2>
          <p>Spaced repetition reviews will appear here</p>
        </div>
      </div>
    </div>
  );
};

