import React from 'react';

export const TestNotesPanel: React.FC = () => {
  console.log('[TestNotesPanel] Rendering test component');
  
  return (
    <div style={{
      padding: '20px',
      background: 'white',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1>Test Notes Panel</h1>
      <p>This is a test to see if the notes panel area is rendering.</p>
      <div style={{ marginTop: '20px' }}>
        <button style={{
          padding: '10px 20px',
          background: '#007AFF',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          Test Button
        </button>
      </div>
    </div>
  );
};