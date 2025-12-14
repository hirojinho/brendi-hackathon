import React from 'react';

export const UltraMinimalZettelkastenPanel: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '20px',
      background: '#ffffff',
      color: '#000000'
    }}>
      <h1>Zettelkasten (Ultra Minimal)</h1>
      <p>This is the most basic version possible.</p>
      <p>If this crashes, the issue is not with the component itself.</p>
    </div>
  );
};