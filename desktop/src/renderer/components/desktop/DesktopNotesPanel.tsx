import React, { useState, useEffect } from 'react';
import { NotesManagementPanel } from './NotesManagementPanel';
import './DesktopPanel.css';

export const DesktopNotesPanel: React.FC = () => {
  const [useSimpleView, setUseSimpleView] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to render the full NotesManagementPanel, fallback to simple view if it fails
  useEffect(() => {
    const timer = setTimeout(() => {
      // If we haven't crashed by now, we're probably okay
      setError(null);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (useSimpleView || error) {
    return (
      <div className="desktop-panel notes-panel">
        <div className="panel-header">
          <h1>Notes</h1>
          <button 
            onClick={() => {
              setUseSimpleView(false);
              setError(null);
            }}
            className="macos-button macos-button--secondary macos-button--small"
          >
            Try Full View
          </button>
        </div>
        <div className="panel-content">
          <div className="simple-notes-view">
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h2>Notes Panel (Simple View)</h2>
              <p>The full notes interface is temporarily unavailable.</p>
              <p>This simplified view ensures the application remains stable.</p>
              {error && (
                <div className="error-details">
                  <p><strong>Error:</strong> {error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="desktop-panel notes-panel">
        <NotesManagementPanel />
      </div>
    );
  } catch (err) {
    console.error('NotesManagementPanel error:', err);
    setError(err instanceof Error ? err.message : 'Unknown error');
    setUseSimpleView(true);
    
    return (
      <div className="desktop-panel notes-panel">
        <div className="panel-header">
          <h1>Notes</h1>
        </div>
        <div className="panel-content">
          <div className="simple-notes-view">
            <div className="empty-state">
              <div className="empty-icon">⚠️</div>
              <h2>Notes Panel Error</h2>
              <p>The notes panel encountered an error and switched to simple view.</p>
              <p><strong>Error:</strong> {err instanceof Error ? err.message : 'Unknown error'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

