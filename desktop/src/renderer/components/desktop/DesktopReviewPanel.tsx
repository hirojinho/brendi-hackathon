import React, { useState, useEffect } from 'react';
import './DesktopPanel.css';

/**
 * DesktopReviewPanel - SRS (Spaced Repetition System) Review Panel
 * 
 * NOTE: This is the LEGACY SRS-based review system for spaced repetition learning.
 * This is separate from the Quick Note to Permanent Note review system.
 * 
 * The Quick Note review system is implemented in:
 * - ReviewSession component (for reviewing quick notes to convert to permanent notes)
 * - Used in NotesManagementPanel when clicking "Start Review"
 * 
 * This panel is a placeholder for future SRS implementation.
 */
interface DesktopReviewPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
}

export const DesktopReviewPanel: React.FC<DesktopReviewPanelProps> = ({ model, modelName }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[DesktopReviewPanel] Component mounted');
    console.log('[DesktopReviewPanel] Props:', { model, modelName });
    
    // Simulate component initialization
    const timer = setTimeout(() => {
      try {
        // Add any initialization logic here
        console.log('[DesktopReviewPanel] Initialized with model:', model, modelName);
        setIsLoaded(true);
        
        // Diagnostic: Check if container is visible
        if (containerRef.current) {
          const styles = window.getComputedStyle(containerRef.current);
          console.log('[DesktopReviewPanel] Container styles:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            width: styles.width,
            height: styles.height,
            backgroundColor: styles.backgroundColor,
            color: styles.color,
          });
        }
      } catch (err) {
        console.error('[DesktopReviewPanel] Error during initialization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }, 100);

    return () => {
      console.log('[DesktopReviewPanel] Component unmounting');
      clearTimeout(timer);
    };
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
    <div 
      ref={containerRef}
      className="desktop-panel"
    >
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

