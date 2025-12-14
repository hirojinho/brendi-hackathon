import React, { useState, useEffect } from 'react';
import { DesktopSidebar } from './desktop/DesktopSidebar';
import { DesktopChatPanel } from './desktop/DesktopChatPanel';
import { DesktopNotesPanel } from './desktop/DesktopNotesPanel';
import { DesktopDocumentsPanel } from './desktop/DesktopDocumentsPanel';
import { DesktopReviewPanel } from './desktop/DesktopReviewPanel';
import { DesktopZettelkastenPanel } from './desktop/DesktopZettelkastenPanel';
import { useSystemPreferences } from '../hooks/useSystemPreferences';
import { ErrorBoundary } from './common/ErrorBoundary';
import { NotificationProvider } from './common/NotificationSystem';
import { FadeTransition } from './common/Transitions';
import { ApplicationIntegration } from './integration/ApplicationIntegration';
import { EnhancedErrorBoundary } from './integration/EnhancedErrorHandling';
import { MacOSFadeTransition } from './integration/EnhancedTransitions';
import { WorkflowValidator } from './integration/WorkflowValidator';
import './DesktopApp.css';
import './integration/EnhancedTransitions.css';
import './integration/WorkflowValidator.css';

type TabType = 'chat' | 'notes' | 'zettelkasten' | 'review' | 'documents';

export const DesktopApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [model, setModel] = useState<'openrouter' | 'openai' | 'ollama'>('openrouter');
  const [openrouterModelName, setOpenrouterModelName] = useState<string>('qwen/qwen3-14b:free');
  const [ollamaModelName, setOllamaModelName] = useState<string>('phi3:latest');
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'ollama'>('ollama');
  const [showWorkflowValidator, setShowWorkflowValidator] = useState(false);
  
  // Initialize system preferences support
  useSystemPreferences();

  // Load initial state from main process
  useEffect(() => {
    const loadInitialState = async () => {
      if (window.electronAPI?.getState) {
        try {
          const state = await window.electronAPI.getState();
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
          console.warn('[DesktopApp] Failed to load initial state:', error);
        }
      }
    };

    loadInitialState();
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

      // Development shortcuts for integration testing
      if (process.env.NODE_ENV === 'development' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        if (event.key === 'V') {
          event.preventDefault();
          setShowWorkflowValidator(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync state changes to main process
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (window.electronAPI?.setState) {
      window.electronAPI.setState('lastActiveTab', tab);
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
        // Could send to error reporting service here
      }}
    >
      <NotificationProvider>
        <ApplicationIntegration>
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
              <MacOSFadeTransition isVisible={activeTab === 'chat'} duration={250}>
                <DesktopChatPanel
                  model={model}
                  modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
                  embeddingProvider={embeddingProvider}
                />
              </MacOSFadeTransition>
              
              <MacOSFadeTransition isVisible={activeTab === 'notes'} duration={250}>
                <DesktopNotesPanel />
              </MacOSFadeTransition>
              
              <MacOSFadeTransition isVisible={activeTab === 'zettelkasten'} duration={250}>
                <DesktopZettelkastenPanel />
              </MacOSFadeTransition>
              
              <MacOSFadeTransition isVisible={activeTab === 'review'} duration={250}>
                <DesktopReviewPanel
                  model={model}
                  modelName={model === 'openrouter' ? openrouterModelName : model === 'ollama' ? ollamaModelName : undefined}
                />
              </MacOSFadeTransition>
              
              <MacOSFadeTransition isVisible={activeTab === 'documents'} duration={250}>
                <DesktopDocumentsPanel embeddingProvider={embeddingProvider} />
              </MacOSFadeTransition>
            </div>
          </div>

          {/* Development Tools */}
          {process.env.NODE_ENV === 'development' && (
            <WorkflowValidator
              isVisible={showWorkflowValidator}
              onClose={() => setShowWorkflowValidator(false)}
            />
          )}
        </ApplicationIntegration>
      </NotificationProvider>
    </EnhancedErrorBoundary>
  );
};

