import React from 'react';
import NoteTakingAgent from '../note-taking/NoteTakingAgent';
import './DesktopPanel.css';

export const DesktopNotesPanel: React.FC = () => {
  return (
    <div className="desktop-panel notes-panel">
      <NoteTakingAgent />
    </div>
  );
};

