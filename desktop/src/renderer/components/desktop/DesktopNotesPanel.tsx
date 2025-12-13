import React from 'react';
import { NotesManagementPanel } from './NotesManagementPanel';
import './DesktopPanel.css';

export const DesktopNotesPanel: React.FC = () => {
  return (
    <div className="desktop-panel notes-panel">
      <NotesManagementPanel />
    </div>
  );
};

