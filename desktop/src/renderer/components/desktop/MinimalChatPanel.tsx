import React from 'react';
import './DesktopPanel.css';

interface MinimalChatPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
  embeddingProvider: 'openai' | 'ollama';
}

export const MinimalChatPanel: React.FC<MinimalChatPanelProps> = ({ model, modelName, embeddingProvider }) => {
  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Chat</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h2>Chat Panel (Minimal Mode)</h2>
          <p>Chat functionality is temporarily simplified to prevent crashes.</p>
          <p className="status-text">
            Model: {model} {modelName && `(${modelName})`} | Embedding: {embeddingProvider}
          </p>
          <div style={{ marginTop: '20px' }}>
            <button className="macos-button macos-button--primary macos-button--medium">
              Start Chat (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};