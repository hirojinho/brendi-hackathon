import React from 'react';

interface ChatHeaderProps {
  onSettingsClick: () => void;
  onClose: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onSettingsClick, onClose }) => {
  const handleOpenMainWindow = async () => {
    try {
      console.log('[ChatHeader] Opening main window...');
      if (!window.electronAPI || !window.electronAPI.openMainWindow) {
        console.error('[ChatHeader] electronAPI.openMainWindow is not available');
        alert('Unable to open main window: API not available');
        return;
      }
      const result = await window.electronAPI.openMainWindow();
      console.log('[ChatHeader] Main window opened:', result);
    } catch (error) {
      console.error('[ChatHeader] Failed to open main window:', error);
      alert(`Failed to open main window: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="chat-header">
      <h2>Study Assistant</h2>
      <div className="header-actions">
        <button 
          className="open-main-btn"
          onClick={handleOpenMainWindow}
          title="Open Full App"
        >
          Open Full App
        </button>
        <button 
          className="settings-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          className="close-btn"
          onClick={onClose}
          title="Close (ESC)"
        >
          ×
        </button>
      </div>
    </div>
  );
};

