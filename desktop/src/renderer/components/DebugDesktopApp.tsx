import React, { useState } from 'react';
import { DesktopSidebar } from './desktop/DesktopSidebar';
import { UltraMinimalZettelkastenPanel } from './desktop/UltraMinimalZettelkastenPanel';
import { MinimalChatPanel } from './desktop/MinimalChatPanel';
import { MinimalNotesPanel } from './desktop/MinimalNotesPanel';
import './DesktopApp.css';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

const SimpleTabContent: React.FC<{ tabName: string }> = ({ tabName }) => (
  <div className="desktop-panel">
    <div className="panel-header">
      <h1>{tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h1>
    </div>
    <div className="panel-content">
      <div className="empty-state">
        <div className="empty-icon">✅</div>
        <h2>{tabName.charAt(0).toUpperCase() + tabName.slice(1)} Panel (Debug)</h2>
        <p>This is a simplified version for debugging.</p>
      </div>
    </div>
  </div>
);

export const DebugDesktopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [model, setModel] = useState<'openrouter' | 'openai' | 'ollama'>('openrouter');
  const [openrouterModelName, setOpenrouterModelName] = useState<string>('qwen/qwen3-14b:free');
  const [ollamaModelName, setOllamaModelName] = useState<string>('phi3:latest');
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'ollama'>('ollama');

  const handleTabChange = (tab: TabType) => {
    console.log('[DebugDesktopApp] Tab change requested:', tab);
    setActiveTab(tab);
    console.log('[DebugDesktopApp] Tab changed to:', tab);
  };

  const handleModelChange = (newModel: 'openrouter' | 'openai' | 'ollama') => {
    setModel(newModel);
  };

  const handleOpenrouterModelChange = (name: string) => {
    setOpenrouterModelName(name);
  };

  const handleOllamaModelChange = (name: string) => {
    setOllamaModelName(name);
  };

  const handleEmbeddingProviderChange = (provider: 'openai' | 'ollama') => {
    setEmbeddingProvider(provider);
  };

  return (
    <div className="desktop-app">
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        model={model}
        onModelChange={handleModelChange}
        openrouterModelName={openrouterModelName}
        onOpenrouterModelChange={handleOpenrouterModelChange}
        ollamaModelName={ollamaModelName}
        onOllamaModelChange={handleOllamaModelChange}
        embeddingProvider={embeddingProvider}
        onEmbeddingProviderChange={handleEmbeddingProviderChange}
      />
      <div className="desktop-main-content">
        {/* Debug info */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Active: {activeTab}
        </div>

        {/* Direct rendering without transitions or error boundaries */}
        {activeTab === 'chat' && (
          <MinimalChatPanel
            model={model}
            modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
            embeddingProvider={embeddingProvider}
          />
        )}
        
        {activeTab === 'notes' && <MinimalNotesPanel />}
        
        {activeTab === 'zettelkasten' && <UltraMinimalZettelkastenPanel />}
        
        {activeTab === 'review' && <SimpleTabContent tabName="review" />}
        
        {activeTab === 'documents' && <SimpleTabContent tabName="documents" />}
      </div>
    </div>
  );
};