import React, { useState } from 'react';
import { DesktopSidebar } from './desktop/DesktopSidebar';
import { DesktopChatPanel } from './desktop/DesktopChatPanel';
import { DesktopNotesPanel } from './desktop/DesktopNotesPanel';
import { DesktopDocumentsPanel } from './desktop/DesktopDocumentsPanel';
import { DesktopReviewPanel } from './desktop/DesktopReviewPanel';
import { DesktopZettelkastenPanel } from './desktop/DesktopZettelkastenPanel';
import { useSystemPreferences } from '../hooks/useSystemPreferences';
import './DesktopApp.css';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

export const DesktopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [model, setModel] = useState<'openrouter' | 'openai' | 'ollama'>('openrouter');
  const [openrouterModelName, setOpenrouterModelName] = useState<string>('qwen/qwen3-14b:free');
  const [ollamaModelName, setOllamaModelName] = useState<string>('phi3:latest');
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'ollama'>('ollama');
  
  // Initialize system preferences support
  useSystemPreferences();

  return (
    <div className="desktop-app">
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        model={model}
        onModelChange={setModel}
        openrouterModelName={openrouterModelName}
        onOpenrouterModelChange={setOpenrouterModelName}
        ollamaModelName={ollamaModelName}
        onOllamaModelChange={setOllamaModelName}
        embeddingProvider={embeddingProvider}
        onEmbeddingProviderChange={setEmbeddingProvider}
      />
      <div className="desktop-main-content">
        {activeTab === 'chat' && (
          <DesktopChatPanel
            model={model}
            modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
            embeddingProvider={embeddingProvider}
          />
        )}
        {activeTab === 'notes' && <DesktopNotesPanel />}
        {activeTab === 'zettelkasten' && <DesktopZettelkastenPanel />}
        {activeTab === 'review' && (
          <DesktopReviewPanel
            model={model}
            modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
          />
        )}
        {activeTab === 'documents' && <DesktopDocumentsPanel embeddingProvider={embeddingProvider} />}
      </div>
    </div>
  );
};

