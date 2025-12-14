import React, { useState, useEffect } from 'react';
import { NotesManagementPanel } from './NotesManagementPanel';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useBackendHealth } from '../../hooks/useBackendHealth';

export const UltraMinimalZettelkastenPanel: React.FC = () => {
  const [useSimpleView, setUseSimpleView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady, isChecking } = useBackendHealth();

  // Try to render the full NotesManagementPanel, fallback to simple view if it fails
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady && !isChecking) {
        setUseSimpleView(true);
        setError('Backend not available - using simple view');
      }
    }, 5000); // Wait 5 seconds for backend to be ready

    return () => clearTimeout(timer);
  }, [isReady, isChecking]);

  // Show loading state while backend is starting
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px',
        background: '#ffffff',
        color: '#000000',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '16px' }}>🔄</div>
        <h2>Starting Notes System...</h2>
        <p>Please wait while the backend initializes.</p>
      </div>
    );
  }

  // Show simple view if backend is not ready or if there was an error
  if (useSimpleView || error || !isReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '20px',
        background: '#ffffff',
        color: '#000000'
      }}>
        <h1>Zettelkasten (Simple Mode)</h1>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p><strong>Backend Status:</strong> {error || 'Not connected'}</p>
          <p>The full notes interface requires a working backend connection.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <p>Notes will appear here once the backend is connected.</p>
          </div>
        </div>
      </div>
    );
  }

  // Try to render the full NotesManagementPanel
  try {
    return (
      <div style={{ height: '100%', background: '#ffffff' }}>
        <ErrorBoundary
          fallback={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              padding: '20px',
              background: '#ffffff',
              color: '#000000',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ marginBottom: '16px' }}>⚠️</div>
              <h2>Notes Interface Error</h2>
              <p>There was an error loading the notes interface.</p>
              <button 
                onClick={() => setUseSimpleView(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Use Simple View
              </button>
            </div>
          }
        >
          <NotesManagementPanel />
        </ErrorBoundary>
      </div>
    );
  } catch (err) {
    console.error('NotesManagementPanel error:', err);
    setError(err instanceof Error ? err.message : 'Unknown error');
    setUseSimpleView(true);
    return null; // Will re-render with simple view
  }
};