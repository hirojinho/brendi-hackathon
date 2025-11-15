import { useEffect, useRef } from 'react';
import ChatBox from './components/ChatBox';
import { StatusMessage } from './components/layout';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './App.css';

function App() {
  const { isReady, isChecking } = useBackendHealth();
  const overlayRef = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts();

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (overlayRef.current && isReady) {
      const input = overlayRef.current.querySelector('input, textarea');
      if (input) {
        (input as HTMLElement).focus();
      }
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <div className="overlay-container">
        <div className="overlay-content">
          <StatusMessage
            message={isChecking ? 'Starting backend...' : 'Backend failed to start'}
            error={!isChecking ? 'Please check the console for errors.' : undefined}
          />
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
