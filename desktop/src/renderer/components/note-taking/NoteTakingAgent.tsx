import React, { useState, useEffect, useRef } from 'react';
import { useNoteTaking } from '../../hooks/useNoteTaking';
import { useContexts } from '../../hooks/useContexts';
import { useReview } from '../../hooks/useReview';
import { useQuickNotesStatus } from '../../hooks/useQuickNotesStatus';
import { quickNotesService } from '../../services/quickNotesService';
import { ChatInput } from '../chat';
import SettingsPanel from '../SettingsPanel';
import { QuickNotesView } from '../quick-notes';
import { NoteTakingResult } from './NoteTakingResult';
import { ContextCreationPrompt } from './ContextCreationPrompt';
import { NoteTakingEmptyState } from './NoteTakingEmptyState';
import { ReviewSession } from '../review';
import '../ChatBox.css';
import './MinimalNoteTaking.css';

const NoteTakingAgent: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickNotes, setShowQuickNotes] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedContextId] = useState<string | null>(null);
  const [showContextCreation, setShowContextCreation] = useState(false);
  const [pendingContext, setPendingContext] = useState<{ 
    name: string; 
    description?: string; 
    parentId?: string | null 
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    contexts,
    createContext,
  } = useContexts({ hierarchy: true, autoLoad: true });

  const {
    reviewStatus,
    isReviewRequired,
    loadReviewStatus
  } = useReview({ autoLoad: true });

  const {
    status: quickNotesStatus,
    reload: reloadQuickNotesStatus
  } = useQuickNotesStatus();

  const {
    input,
    isLoading,
    lastResult,
    model,
    modelName,
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

  // Auto-focus input field
  useEffect(() => {
    if (inputRef.current && !showReview && !showQuickNotes && !showContextCreation) {
      inputRef.current.focus();
    }
  }, [showReview, showQuickNotes, showContextCreation]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else if (showQuickNotes) {
          setShowQuickNotes(false);
        } else if (showReview) {
          setShowReview(false);
        } else {
          window.electronAPI.toggleOverlay();
        }
        return;
      }

      // Only handle other shortcuts when not in input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (isReviewRequired) {
          setShowReview(true);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowQuickNotes(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        window.electronAPI.openMainWindow({ initialTab: 'notes', fromOverlay: true });
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, showQuickNotes, showReview, isReviewRequired]);

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
    
    // Check if review is required before allowing new notes
    if (isReviewRequired) {
      setNotification(`Review required: ${reviewStatus?.reviewCount || 0} notes need attention`);
      setShowReview(true);
      return;
    }
    
    // Check if at note limit
    if (quickNotesStatus && !quickNotesStatus.canCreateNew) {
      if (quickNotesStatus.isAtLimit) {
        setNotification(`Note limit reached: ${quickNotesStatus.currentCount}/${quickNotesStatus.maxQuickNotes}. Review notes to continue.`);
        setShowReview(true);
        return;
      }
      if (quickNotesStatus.isReviewRequired) {
        setNotification(`Review required before creating new notes`);
        setShowReview(true);
        return;
      }
    }
    
    processInput();
  };

  const handleReviewComplete = () => {
    setShowReview(false);
    // Refresh review status and quick notes status after completion
    loadReviewStatus();
    reloadQuickNotesStatus();
  };

  const handleReviewCancel = () => {
    setShowReview(false);
  };

  if (showQuickNotes) {
    return <QuickNotesView onBack={() => setShowQuickNotes(false)} />;
  }

  if (showReview) {
    return (
      <ReviewSession 
        onComplete={handleReviewComplete}
        onCancel={handleReviewCancel}
      />
    );
  }

  return (
    <div className="minimal-note-taking">
      {/* Minimal header - only close button */}
      <div className="minimal-header">
        <button 
          className="minimal-close-btn"
          onClick={() => window.electronAPI.toggleOverlay()}
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      {/* Hidden settings panel */}
      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Subtle status indicator */}
      <div className="minimal-status">
        {isReviewRequired && (
          <div className="status-indicator review-required">
            {reviewStatus?.reviewCount || 0} notes need review
          </div>
        )}
        {quickNotesStatus && quickNotesStatus.isAtLimit && !isReviewRequired && (
          <div className="status-indicator note-limit">
            {quickNotesStatus.currentCount}/{quickNotesStatus.maxQuickNotes} notes
          </div>
        )}
        {quickNotesStatus && !quickNotesStatus.isAtLimit && !isReviewRequired && quickNotesStatus.currentCount > 0 && (
          <div className="status-indicator note-count">
            {quickNotesStatus.currentCount}/{quickNotesStatus.maxQuickNotes}
          </div>
        )}
        {selectedContextId && (
          <div className="status-indicator context-active">
            {contexts.find(c => c.id === selectedContextId)?.name || 'Context active'}
          </div>
        )}
        {/* Debug: Show current model */}
        <div className="status-indicator model-debug" style={{ fontSize: '10px', opacity: 0.7 }}>
          {model}{modelName ? ` (${modelName})` : ''}
        </div>
      </div>

      {/* Notification overlay */}
      {notification && (
        <div className="notification-overlay">
          {notification}
        </div>
      )}

      {/* Main content area */}
      <div className="minimal-content">
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
      </div>

      {/* Minimal input area */}
      <div className="minimal-input-area">
        {/* Review button when review is required */}
        {(isReviewRequired || (quickNotesStatus && !quickNotesStatus.canCreateNew)) && (
          <div className="review-prompt">
            <button 
              className="review-button"
              onClick={() => setShowReview(true)}
            >
              {isReviewRequired 
                ? `Review ${reviewStatus?.reviewCount || 0} Notes`
                : quickNotesStatus && quickNotesStatus.isAtLimit
                ? `Review Notes (${quickNotesStatus.currentCount}/${quickNotesStatus.maxQuickNotes})`
                : "Review Required"
              }
            </button>
            <p className="review-prompt-text">
              {isReviewRequired 
                ? `${reviewStatus?.reviewCount || 0} notes need your attention before you can create new ones.`
                : quickNotesStatus && quickNotesStatus.isAtLimit
                ? "You've reached the note limit. Review existing notes to continue."
                : "Review is required before creating new notes."
              }
            </p>
            {/* Debug info */}
            <p className="review-debug-info" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              Debug: isReviewRequired={isReviewRequired ? 'true' : 'false'}, 
              reviewCount={reviewStatus?.reviewCount || 0}, 
              canCreateNew={quickNotesStatus?.canCreateNew ? 'true' : 'false'},
              currentCount={quickNotesStatus?.currentCount || 0}
            </p>
          </div>
        )}
        
        <ChatInput
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={Boolean(isLoading || isReviewRequired || (quickNotesStatus && !quickNotesStatus.canCreateNew))}
          placeholder={
            isReviewRequired 
              ? "Review required - click button above or press Tab"
              : quickNotesStatus && quickNotesStatus.isAtLimit
              ? "Note limit reached - review notes to continue"
              : quickNotesStatus && !quickNotesStatus.canCreateNew
              ? "Review required before creating new notes"
              : "Capture your thoughts..."
          }
        />
        
        {/* View Notes button */}
        <div className="view-notes-section">
          <button 
            className="view-notes-button"
            onClick={() => window.electronAPI.openMainWindow({ initialTab: 'notes', fromOverlay: true })}
            title="Open main window to view all your notes"
          >
            📚 View All Notes
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="keyboard-hints">
          <span>Tab: Review</span>
          <span>Cmd+N: Notes</span>
          <span>Cmd+O: View All</span>
          <span>Esc: Close</span>
        </div>
      </div>
    </div>
  );
};

export default NoteTakingAgent;

