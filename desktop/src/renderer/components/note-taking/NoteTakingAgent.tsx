import React, { useState, useEffect } from 'react';
import { useNoteTaking } from '../../hooks/useNoteTaking';
import { useContexts } from '../../hooks/useContexts';
import { quickNotesService } from '../../services/quickNotesService';
import { ChatHeader } from '../layout';
import { ChatInput } from '../chat';
import SettingsPanel from '../SettingsPanel';
import { QuickNotesView } from '../quick-notes';
import { ContextSelector, ContextBadge } from '../contexts';
import { getContextName } from '../../utils/contextUtils';
import { NoteTakingResult } from './NoteTakingResult';
import { ContextCreationPrompt } from './ContextCreationPrompt';
import { NoteTakingEmptyState } from './NoteTakingEmptyState';
import { NoteTakingModeIndicator } from './NoteTakingModeIndicator';
import '../ChatBox.css';

const NoteTakingAgent: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickNotes, setShowQuickNotes] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [showContextCreation, setShowContextCreation] = useState(false);
  const [pendingContext, setPendingContext] = useState<{ 
    name: string; 
    description?: string; 
    parentId?: string | null 
  } | null>(null);

  const {
    contexts,
    loadContexts,
    createContext,
  } = useContexts({ hierarchy: true, autoLoad: true });

  const {
    input,
    isLoading,
    lastResult,
    setInput,
    processInput,
    clearResult,
  } = useNoteTaking({ selectedContextId });

  useEffect(() => {
    // Check if agent suggested a new context
    if (lastResult?.suggestedContext) {
      setPendingContext({
        name: lastResult.suggestedContext.name || '',
        description: lastResult.suggestedContext.description,
        parentId: lastResult.suggestedContext.parentId || null
      });
      setShowContextCreation(true);
    }
  }, [lastResult]);

  const handleCreateContext = async () => {
    if (!pendingContext) return;
    try {
      const newContext = await createContext({
        name: pendingContext.name,
        description: pendingContext.description,
        parentId: pendingContext.parentId || null
      });
      
      // If notes were created, link them to the new context
      if (lastResult && lastResult.shouldCreateNote && lastResult.createdNoteIds && lastResult.createdNoteIds.length > 0) {
        for (const noteId of lastResult.createdNoteIds) {
          try {
            await quickNotesService.update({
              id: noteId,
              contextId: newContext.id
            });
          } catch (error) {
            console.error('Failed to link note to context:', error);
          }
        }
      }
      
      setShowContextCreation(false);
      setPendingContext(null);
    } catch (error) {
      console.error('Failed to create context:', error);
      alert('Failed to create context. Please try again.');
    }
  };

  const handleCancelContextCreation = () => {
    setShowContextCreation(false);
    setPendingContext(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processInput();
  };

  if (showQuickNotes) {
    return <QuickNotesView onBack={() => setShowQuickNotes(false)} />;
  }

  return (
    <div className="chat-box">
      <ChatHeader
        onSettingsClick={() => setShowSettings(true)}
        onClose={() => window.electronAPI.toggleOverlay()}
      />

      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <NoteTakingModeIndicator
        selectedContextId={selectedContextId}
        contexts={contexts}
        onContextChange={setSelectedContextId}
        onViewNotes={() => setShowQuickNotes(true)}
        isLoading={isLoading}
      />

      {!lastResult && !isLoading && <NoteTakingEmptyState />}

      {showContextCreation && pendingContext && (
        <ContextCreationPrompt
          pendingContext={pendingContext}
          contexts={contexts}
          onContextChange={(updates) => setPendingContext({ ...pendingContext, ...updates })}
          onCreate={handleCreateContext}
          onCancel={handleCancelContextCreation}
        />
      )}

      {lastResult && (
        <NoteTakingResult
          result={lastResult}
          contexts={contexts}
          onClear={clearResult}
        />
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
        placeholder="Type your notes here... (e.g., 'At AWS re:Invent, I learned that...' or 'From the Clean Code book...')"
      />
    </div>
  );
};

export default NoteTakingAgent;

