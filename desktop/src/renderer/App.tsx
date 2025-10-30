import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatBox from './components/ChatBox';
import './App.css';

function App() {
  const [isReady, setIsReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll backend health until it's ready
    const maxRetries = 30; // 30 attempts (15 seconds max with 500ms interval)
    
    const checkHealth = async (attempt: number): Promise<boolean> => {
      try {
        const health = await window.electronAPI.checkHealth();
        if (health.healthy) {
          setIsReady(true);
          console.log('Backend is ready:', health.url);
          return true;
        } else {
          console.log(`Backend not ready yet (attempt ${attempt + 1}/${maxRetries}):`, health.error);
          return false;
        }
      } catch (error) {
        console.error('Health check failed:', error);
        return false;
      }
    };

    // Start polling immediately, then retry every 500ms
    const pollHealth = async (attempt: number = 0) => {
      const isReady = await checkHealth(attempt);
      if (!isReady && attempt < maxRetries - 1) {
        setTimeout(() => pollHealth(attempt + 1), 500);
      } else if (!isReady) {
        console.error('Backend failed to start after', maxRetries, 'attempts');
        setIsReady(false);
      }
    };

    pollHealth();

    // Handle ESC key to close overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.toggleOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (overlayRef.current) {
      const input = overlayRef.current.querySelector('input, textarea');
      if (input) {
        (input as HTMLElement).focus();
      }
    }
  }, []);

  if (!isReady) {
    return (
      <div className="overlay-container">
        <div className="overlay-content">
          <div className="status-message">
            <p>Starting backend...</p>
            <p className="status-error">If this persists, check the console for errors.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-container" ref={overlayRef}>
      <div className="overlay-content">
        <ChatBox />
      </div>
    </div>
  );
}

export default App;

