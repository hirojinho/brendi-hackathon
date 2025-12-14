import React, { useState, useEffect } from 'react';
import './DesktopPanel.css';

interface DesktopReviewPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
}

export const DesktopReviewPanel: React.FC<DesktopReviewPanelProps> = ({ model, modelName }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate component initialization
    const timer = setTimeout(() => {
      try {
        // Add any initialization logic here
        console.log('Review panel initialized with model:', model, modelName);
        setIsLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [model, modelName]);

  if (error) {
    return (
      <div className="desktop-panel">
        <div className="panel-header">
          <h1>Review</h1>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <div className="empty-icon">⚠️</div>
            <h2>Review Panel Error</h2>
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
        <h1>Review</h1>
      </div>
      <div className="panel-content">
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Review Session</h2>
          <p>Spaced repetition reviews will appear here</p>
          <p className="status-text">
            Status: {isLoaded ? 'Ready' : 'Loading...'} | Model: {model} {modelName && `(${modelName})`}
          </p>
        </div>
      </div>
    </div>
  );
};

