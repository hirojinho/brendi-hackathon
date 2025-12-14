import React, { useState } from 'react';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

const SimpleTab: React.FC<{ name: string; isActive: boolean }> = ({ name, isActive }) => {
  if (!isActive) return null;
  
  return (
    <div style={{
      padding: '20px',
      background: '#ffffff',
      color: '#000000',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1>{name} Tab</h1>
      <p>This is the {name} tab content.</p>
      <p>Ultra-simplified version for debugging.</p>
    </div>
  );
};

export const SimpleDesktopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  const handleTabClick = (tab: TabType) => {
    console.log('Tab clicked:', tab);
    setActiveTab(tab);
    console.log('Tab set to:', tab);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Simple Sidebar */}
      <div style={{
        width: '200px',
        background: '#f0f0f0',
        padding: '20px',
        borderRight: '1px solid #ccc'
      }}>
        <h2>Tabs</h2>
        {(['chat', 'notes', 'zettelkasten', 'review', 'documents'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              margin: '5px 0',
              background: activeTab === tab ? '#007AFF' : '#ffffff',
              color: activeTab === tab ? '#ffffff' : '#000000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Simple Content Area */}
      <div style={{ flex: 1, background: '#ffffff' }}>
        <SimpleTab name="Chat" isActive={activeTab === 'chat'} />
        <SimpleTab name="Notes" isActive={activeTab === 'notes'} />
        <SimpleTab name="Zettelkasten" isActive={activeTab === 'zettelkasten'} />
        <SimpleTab name="Review" isActive={activeTab === 'review'} />
        <SimpleTab name="Documents" isActive={activeTab === 'documents'} />
      </div>
    </div>
  );
};