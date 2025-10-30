import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatBox from './components/ChatBox';
import './App.css';

function App() {
  const [isReady, setIsReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check backend health on mount
    const checkHealth = async () => {
      try {
        const health = await window.electronAPI.checkHealth();
        setIsReady(health.healthy);
        if (!health.healthy) {
          console.error('Backend not healthy:', health.error);
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setIsReady(false);
      }
    };

    checkHealth();

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

