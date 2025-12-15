import React, { useState, useEffect } from 'react';
import { DesktopSidebar } from './layout';
import { DesktopChatPanel, DesktopDocumentsPanel, DesktopReviewPanel, NotesManagementPanel } from './panels';
import { useSystemPreferences } from '../hooks/useSystemPreferences';
import { ErrorBoundary, NotificationProvider } from './common';
import { EnhancedErrorBoundary, MacOSFadeTransition } from './integration';
import './DesktopApp.css';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

export const DesktopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [model, setModel] = useState<'openrouter' | 'openai' | 'ollama'>('openrouter');
  const [openrouterModelName, setOpenrouterModelName] = useState<string>('qwen/qwen3-14b:free');
  const [ollamaModelName, setOllamaModelName] = useState<string>('phi3:latest');
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'ollama'>('ollama');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Initialize system preferences support
  useSystemPreferences();

  // Load initial state from main process
  useEffect(() => {
    let isMounted = true;
    const loadInitialState = async () => {
      if (window.electronAPI?.getState) {
        try {
          const state = await window.electronAPI.getState();
          if (!isMounted) return;
          
          if (state.lastActiveTab) {
            setActiveTab(state.lastActiveTab);
          }
          if (state.lastUsedModel) {
            setModel(state.lastUsedModel);
          }
          if (state.lastUsedModelName && state.lastUsedModel === 'openrouter') {
            setOpenrouterModelName(state.lastUsedModelName);
          }
          if (state.lastUsedModelName && state.lastUsedModel === 'ollama') {
            setOllamaModelName(state.lastUsedModelName);
          }
          if (state.lastEmbeddingProvider) {
            setEmbeddingProvider(state.lastEmbeddingProvider);
          }
        } catch (error) {
          if (isMounted) {
            console.warn('[DesktopApp] Failed to load initial state:', error);
          }
        }
      }
    };

    loadInitialState().catch((error) => {
      if (isMounted) {
        console.error('[DesktopApp] Unhandled error loading initial state:', error);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for navigation events from main process
  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent) => {
      const { tabName } = event.detail;
      if (tabName && ['chat', 'notes', 'zettelkasten', 'review', 'documents'].includes(tabName)) {
        setActiveTab(tabName as TabType);
      }
    };

    const handleStateUpdate = (event: CustomEvent) => {
      const stateUpdate = event.detail;
      if (stateUpdate.lastActiveTab) {
        setActiveTab(stateUpdate.lastActiveTab);
      }
      if (stateUpdate.lastUsedModel) {
        setModel(stateUpdate.lastUsedModel);
      }
      if (stateUpdate.lastUsedModelName) {
        if (model === 'openrouter') {
          setOpenrouterModelName(stateUpdate.lastUsedModelName);
        } else if (model === 'ollama') {
          setOllamaModelName(stateUpdate.lastUsedModelName);
        }
      }
      if (stateUpdate.lastEmbeddingProvider) {
        setEmbeddingProvider(stateUpdate.lastEmbeddingProvider);
      }
    };

    window.addEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
    window.addEventListener('state-updated', handleStateUpdate as EventListener);

    return () => {
      window.removeEventListener('navigate-to-tab', handleNavigateToTab as EventListener);
      window.removeEventListener('state-updated', handleStateUpdate as EventListener);
    };
  }, [model]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Space to toggle overlay
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'Space') {
        event.preventDefault();
        if (window.electronAPI?.toggleOverlay) {
          window.electronAPI.toggleOverlay();
        }
      }
      
      // Cmd/Ctrl + 1-5 for tab navigation
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        const tabMap: Record<string, TabType> = {
          '1': 'chat',
          '2': 'notes',
          '3': 'zettelkasten',
          '4': 'review',
          '5': 'documents'
        };
        
        if (tabMap[event.key]) {
          event.preventDefault();
          setActiveTab(tabMap[event.key]);
        }
      }

      // Development shortcuts
      if (process.env.NODE_ENV === 'development' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        if (event.key === 'D') {
          event.preventDefault();
          setShowDiagnostics(!showDiagnostics);
        }
      }

      // Escape key to hide diagnostics
      if (event.key === 'Escape' && showDiagnostics) {
        event.preventDefault();
        setShowDiagnostics(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync state changes to main process
  const handleTabChange = (tab: TabType) => {
    console.log('[DesktopApp] Tab change requested:', tab);
    try {
      setActiveTab(tab);
      console.log('[DesktopApp] Tab state updated to:', tab);
      if (window.electronAPI?.setState) {
        window.electronAPI.setState('lastActiveTab', tab);
        console.log('[DesktopApp] Electron state updated');
      }
    } catch (error) {
      console.error('[DesktopApp] Error during tab change:', error);
    }
  };

  const handleModelChange = (newModel: 'openrouter' | 'openai' | 'ollama') => {
    setModel(newModel);
    if (window.electronAPI?.setState) {
      window.electronAPI.setState('lastUsedModel', newModel);
    }
  };

  const handleOpenrouterModelChange = (name: string) => {
    setOpenrouterModelName(name);
    if (window.electronAPI?.setState) {
      window.electronAPI.setState('lastUsedModelName', name);
    }
  };

  const handleOllamaModelChange = (name: string) => {
    setOllamaModelName(name);
    if (window.electronAPI?.setState) {
      window.electronAPI.setState('lastUsedModelName', name);
    }
  };

  const handleEmbeddingProviderChange = (provider: 'openai' | 'ollama') => {
    setEmbeddingProvider(provider);
    if (window.electronAPI?.setState) {
      window.electronAPI.setState('lastEmbeddingProvider', provider);
    }
  };

  return (
    <EnhancedErrorBoundary
      enableRecovery={true}
      maxRetries={3}
      showErrorDetails={process.env.NODE_ENV === 'development'}
      onError={(errorDetails) => {
        console.error('[DesktopApp] Application error:', errorDetails);
      }}
    >
      <NotificationProvider>
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
          <div className="desktop-main-content" id="desktop-main-content">
            <ErrorBoundary
              fallback={
                <div className="tab-error-fallback">
                  <div className="error-icon">⚠️</div>
                  <h2>Panel Error</h2>
                  <p>The panel encountered an error. Please try refreshing the application.</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="macos-button macos-button--primary macos-button--medium"
                  >
                    Refresh App
                  </button>
                </div>
              }
            >
              {activeTab === 'chat' && (
                <DesktopChatPanel
                  model={model}
                  modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
                  embeddingProvider={embeddingProvider}
                />
              )}
              
              {activeTab === 'notes' && <NotesManagementPanel />}
              
              {activeTab === 'zettelkasten' && <NotesManagementPanel />}
              
              {activeTab === 'review' && (
                <DesktopReviewPanel
                  model={model}
                  modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
                />
              )}
              
              {activeTab === 'documents' && <DesktopDocumentsPanel embeddingProvider={embeddingProvider} />}
            </ErrorBoundary>
          </div>
        </div>
      </NotificationProvider>
    </EnhancedErrorBoundary>
  );
};

