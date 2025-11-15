import React from 'react';
import './DesktopSidebar.css';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

interface DesktopSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  model: 'openrouter' | 'openai' | 'ollama';
  onModelChange: (model: 'openrouter' | 'openai' | 'ollama') => void;
  openrouterModelName: string;
  onOpenrouterModelChange: (name: string) => void;
  ollamaModelName: string;
  onOllamaModelChange: (name: string) => void;
  embeddingProvider: 'openai' | 'ollama';
  onEmbeddingProviderChange: (provider: 'openai' | 'ollama') => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  model,
  onModelChange,
  openrouterModelName,
  onOpenrouterModelChange,
  ollamaModelName,
  onOllamaModelChange,
  embeddingProvider,
  onEmbeddingProviderChange,
}) => {
  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-header">
        <div className="app-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
          </svg>
          <span>Study Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onTabChange('chat')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => onTabChange('notes')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Notes</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'zettelkasten' ? 'active' : ''}`}
          onClick={() => onTabChange('zettelkasten')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Zettelkasten</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => onTabChange('review')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Review</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => onTabChange('documents')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
          <span>Documents</span>
        </button>
      </nav>

      <div className="sidebar-settings">
        <div className="settings-section">
          <label className="settings-label">Model</label>
          <select
            className="settings-select"
            value={model}
            onChange={(e) => onModelChange(e.target.value as any)}
          >
            <option value="openai">OpenAI (gpt-4o-mini)</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>

        {model === 'openrouter' && (
          <div className="settings-section">
            <label className="settings-label">Model Name</label>
            <input
              className="settings-input"
              type="text"
              value={openrouterModelName}
              onChange={(e) => onOpenrouterModelChange(e.target.value)}
              placeholder="e.g., qwen/qwen3-14b:free"
            />
          </div>
        )}

        {model === 'ollama' && (
          <div className="settings-section">
            <label className="settings-label">Model Name</label>
            <input
              className="settings-input"
              type="text"
              value={ollamaModelName}
              onChange={(e) => onOllamaModelChange(e.target.value)}
              placeholder="e.g., phi3:latest"
            />
          </div>
        )}

        <div className="settings-section">
          <label className="settings-label">Embedding Provider</label>
          <select
            className="settings-select"
            value={embeddingProvider}
            onChange={(e) => onEmbeddingProviderChange(e.target.value as any)}
          >
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (e5-base-v2)</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

