import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { NoteDisplayItem } from './NotesManagementPanel';
import { Message } from '../../types/chat';
import './IntegratedChatPanel.css';

interface IntegratedChatPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  selectedNotes: NoteDisplayItem[];
  onNoteContextChange: (noteIds: string[]) => void;
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
  embeddingProvider: 'openai' | 'ollama';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  contextNoteIds: string[];
  createdAt: Date;
  lastActivity: Date;
}

export const IntegratedChatPanel: React.FC<IntegratedChatPanelProps> = ({
  isVisible,
  onToggleVisibility,
  selectedNotes,
  onNoteContextChange,
  model,
  modelName,
}) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);
  const [contextSelectionMode, setContextSelectionMode] = useState(false);
  const [selectedContextNotes, setSelectedContextNotes] = useState<Set<string>>(new Set());

  const {
    messages,
    input,
    isLoading,
    currentResponse,
    useRag,
    maxChunks,
    setInput,
    setModel: setChatModel,
    setModelName: setChatModelName,
    setUseRag,
    setMaxChunks,
    sendMessage,
    clearChat,
  } = useChat({
    initialModel: model,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update chat model when prop changes
  useEffect(() => {
    setChatModel(model);
    if (modelName) {
      setChatModelName(modelName);
    }
  }, [model, modelName, setChatModel, setChatModelName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentResponse, isLoading]);

  // Initialize with selected notes as context
  useEffect(() => {
    if (selectedNotes.length > 0) {
      const noteIds = selectedNotes.map(note => note.id);
      setSelectedContextNotes(new Set(noteIds));
    }
  }, [selectedNotes]);

  // Save chat session when messages change
  useEffect(() => {
    if (messages.length > 0 && activeChatId) {
      saveChatSession();
    }
  }, [messages, activeChatId]);

  const activeSession = useMemo(() => {
    return chatSessions.find(session => session.id === activeChatId);
  }, [chatSessions, activeChatId]);

  const generateSessionTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  const createNewChatSession = () => {
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      contextNoteIds: Array.from(selectedContextNotes),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    clearChat();
    setShowSessionList(false);
  };

  const saveChatSession = () => {
    if (!activeChatId) return;

    setChatSessions(prev => prev.map(session => {
      if (session.id === activeChatId) {
        const updatedSession = {
          ...session,
          messages: [...messages],
          contextNoteIds: Array.from(selectedContextNotes),
          lastActivity: new Date(),
        };

        // Update title based on first user message if it's still "New Chat"
        if (session.title === 'New Chat' && messages.length > 0) {
          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            updatedSession.title = generateSessionTitle(firstUserMessage.content);
          }
        }

        return updatedSession;
      }
      return session;
    }));
  };

  const loadChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setActiveChatId(sessionId);
      setSelectedContextNotes(new Set(session.contextNoteIds));
      // Note: We would need to update the useChat hook to support loading messages
      // For now, we'll clear and let the user continue from where they left off
      clearChat();
      setShowSessionList(false);
    }
  };

  const deleteChatSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeChatId === sessionId) {
      setActiveChatId(null);
      clearChat();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeChatId) {
      createNewChatSession();
    }

    // Add context from selected notes to the message
    let contextualMessage = input;
    if (selectedContextNotes.size > 0) {
      const contextNotes = selectedNotes.filter(note => selectedContextNotes.has(note.id));
      const contextText = contextNotes.map(note => 
        `Note: "${note.title}"\n${note.content}`
      ).join('\n\n');
      
      contextualMessage = `Context from selected notes:\n${contextText}\n\nQuestion: ${input}`;
    }

    await sendMessage(contextualMessage);
  };

  const handleNoteContextToggle = (noteId: string) => {
    const newSelection = new Set(selectedContextNotes);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedContextNotes(newSelection);
    onNoteContextChange(Array.from(newSelection));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isVisible) {
    return (
      <div className="integrated-chat-panel collapsed">
        <button 
          onClick={onToggleVisibility}
          className="chat-toggle-button"
          title="Open Chat"
        >
          💬
        </button>
      </div>
    );
  }

  return (
    <div className="integrated-chat-panel expanded">
      <div className="chat-header">
        <div className="chat-header-left">
          <button 
            onClick={() => setShowSessionList(!showSessionList)}
            className="sessions-button"
            title="Chat Sessions"
          >
            📋
          </button>
          <h2 className="chat-title">
            {activeSession ? activeSession.title : 'Chat'}
          </h2>
        </div>
        
        <div className="chat-header-right">
          <button 
            onClick={() => setContextSelectionMode(!contextSelectionMode)}
            className={`context-button ${selectedContextNotes.size > 0 ? 'has-context' : ''}`}
            title="Select Note Context"
          >
            🔗 {selectedContextNotes.size > 0 ? `${selectedContextNotes.size}` : ''}
          </button>
          
          <button 
            onClick={createNewChatSession}
            className="new-chat-button"
            title="New Chat"
          >
            ➕
          </button>
          
          <button 
            onClick={onToggleVisibility}
            className="close-button"
            title="Close Chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Sessions List */}
      {showSessionList && (
        <div className="chat-sessions-list">
          <div className="sessions-header">
            <h3>Chat Sessions</h3>
            <button 
              onClick={() => setShowSessionList(false)}
              className="close-sessions"
            >
              ✕
            </button>
          </div>
          <div className="sessions-content">
            {chatSessions.length === 0 ? (
              <div className="no-sessions">
                <p>No chat sessions yet</p>
                <button onClick={createNewChatSession} className="create-first-session">
                  Start First Chat
                </button>
              </div>
            ) : (
              <div className="sessions-list">
                {chatSessions.map(session => (
                  <div 
                    key={session.id}
                    className={`session-item ${session.id === activeChatId ? 'active' : ''}`}
                    onClick={() => loadChatSession(session.id)}
                  >
                    <div className="session-info">
                      <h4 className="session-title">{session.title}</h4>
                      <div className="session-meta">
                        <span className="session-date">{formatDate(session.lastActivity)}</span>
                        {session.contextNoteIds.length > 0 && (
                          <span className="session-context">
                            🔗 {session.contextNoteIds.length} note{session.contextNoteIds.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteChatSession(session.id, e)}
                      className="delete-session"
                      title="Delete Session"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Selection Panel */}
      {contextSelectionMode && (
        <div className="context-selection-panel">
          <div className="context-header">
            <h3>Select Notes for Context</h3>
            <button 
              onClick={() => setContextSelectionMode(false)}
              className="close-context"
            >
              ✕
            </button>
          </div>
          <div className="context-notes-list">
            {selectedNotes.length === 0 ? (
              <p className="no-notes-message">No notes available for context</p>
            ) : (
              selectedNotes.map(note => (
                <div 
                  key={note.id}
                  className={`context-note-item ${selectedContextNotes.has(note.id) ? 'selected' : ''}`}
                  onClick={() => handleNoteContextToggle(note.id)}
                >
                  <div className="context-note-checkbox">
                    <input 
                      type="checkbox"
                      checked={selectedContextNotes.has(note.id)}
                      onChange={() => handleNoteContextToggle(note.id)}
                    />
                  </div>
                  <div className="context-note-info">
                    <h4 className="context-note-title">{note.title}</h4>
                    <p className="context-note-excerpt">{note.excerpt}</p>
                    <div className="context-note-meta">
                      <span className={`note-type ${note.type}`}>{note.type}</span>
                      {note.tags.length > 0 && (
                        <span className="note-tags">
                          {note.tags.slice(0, 2).join(', ')}
                          {note.tags.length > 2 && '...'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="context-actions">
            <button 
              onClick={() => {
                setSelectedContextNotes(new Set());
                onNoteContextChange([]);
              }}
              className="clear-context"
            >
              Clear All
            </button>
            <button 
              onClick={() => setContextSelectionMode(false)}
              className="done-context"
            >
              Done ({selectedContextNotes.size} selected)
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages-container">
        <div className="chat-messages">
          {messages.length === 0 && !isLoading && (
            <div className="chat-welcome">
              <div className="welcome-icon">💬</div>
              <h3>Start a Conversation</h3>
              <p>Ask questions about your notes or get help with your studies!</p>
              {selectedContextNotes.size > 0 && (
                <div className="context-indicator">
                  <span className="context-badge">
                    🔗 Using {selectedContextNotes.size} note{selectedContextNotes.size !== 1 ? 's' : ''} as context
                  </span>
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`chat-message ${message.role}`}
            >
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-content">
                {currentResponse ? (
                  <MarkdownRenderer content={currentResponse} />
                ) : (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input Area */}
      <div className="chat-input-area">
        <div className="chat-controls-bar">
          <label className="mac-toggle">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">Use Document Retrieval (RAG)</span>
          </label>
          {useRag && (
            <div className="chunks-control">
              <label>Max Chunks:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxChunks}
                onChange={(e) => setMaxChunks(parseInt(e.target.value) || 5)}
                className="chunks-input"
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedContextNotes.size > 0 
                ? `Ask about your ${selectedContextNotes.size} selected note${selectedContextNotes.size !== 1 ? 's' : ''}... (⌘⏎ to send)`
                : "Type your message... (⌘⏎ to send)"
            }
            disabled={isLoading}
            className="chat-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="chat-send-button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};