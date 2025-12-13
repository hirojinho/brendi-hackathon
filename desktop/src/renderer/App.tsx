import { useEffect, useRef, useState } from 'react';
import ChatBox from './components/ChatBox';
import { NoteTakingAgent } from './components/note-taking';
import { StatusMessage } from './components/layout';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSystemPreferences } from './hooks/useSystemPreferences';
import { settingsService } from './services/settingsService';
import './App.css';

function App() {
  const { isReady, isChecking } = useBackendHealth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'chat' | 'note-taking'>('chat');
  
  // Initialize system preferences support
  useSystemPreferences();
  
  useKeyboardShortcuts();

  // Load default mode from settings on mount
  useEffect(() => {
    const loadDefaultMode = async () => {
      try {
        const settings = await settingsService.loadAllSettings();
        setMode(settings.defaultMode || 'chat');
      } catch (error) {
        console.error('Failed to load default mode:', error);
      }
    };
    loadDefaultMode();
  }, []);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (overlayRef.current && isReady) {
      const input = overlayRef.current.querySelector('input, textarea');
      if (input) {
        (input as HTMLElement).focus();
      }
    }
  }, [isReady, mode]);

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
        {mode === 'chat' ? <ChatBox /> : <NoteTakingAgent />}
      </div>
    </div>
  );
}

export default App;
