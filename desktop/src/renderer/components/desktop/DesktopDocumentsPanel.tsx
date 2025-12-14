import React, { useState, useEffect } from 'react';
import './DesktopPanel.css';

interface DesktopDocumentsPanelProps {
  embeddingProvider: 'openai' | 'ollama';
}

export const DesktopDocumentsPanel: React.FC<DesktopDocumentsPanelProps> = ({ embeddingProvider }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate component initialization
    const timer = setTimeout(() => {
      try {
        // Add any initialization logic here
        console.log('Documents panel initialized with embedding provider:', embeddingProvider);
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [embeddingProvider]);

  if (error) {
    return (
      <div className="desktop-panel">
        <div className="panel-header">
          <h1>Documents</h1>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h2>Documents Panel Error</h2>
            <p>Error: {error}</p>
            <button 
              onClick={() => {
                setError(null);
                setIsLoaded(false);
              }}
              className="macos-button macos-button--primary macos-button--medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="desktop-panel">
      <div className="panel-header">
        <h1>Documents</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h2>Documents</h2>
          <p>Your uploaded documents will appear here</p>
          <p className="status-text">
            Status: {isLoaded ? 'Ready' : 'Loading...'} | Embedding: {embeddingProvider}
          </p>
        </div>
      </div>
    </div>
  );
};

