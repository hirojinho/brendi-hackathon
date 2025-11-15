import React, { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import './DesktopChatPanel.css';

interface DesktopChatPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
  embeddingProvider: 'openai' | 'ollama';
}

export const DesktopChatPanel: React.FC<DesktopChatPanelProps> = ({
  model,
  modelName,
  embeddingProvider,
}) => {
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
  } = useChat({
    initialModel: model,
  });

  // Update chat model when prop changes
  React.useEffect(() => {
    setChatModel(model);
    if (modelName) {
      setChatModelName(modelName);
    }
  }, [model, modelName, setChatModel, setChatModelName]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentResponse, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="desktop-chat-panel">
      <div className="chat-messages-container">
        <div className="chat-messages">
          {messages.length === 0 && !isLoading && (
            <div className="chat-welcome">
              <div className="welcome-icon">💬</div>
              <h2>Start a Conversation</h2>
              <p>Ask me anything about your studies, and I'll help you learn!</p>
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
            placeholder="Type your message... (⌘⏎ to send)"
            disabled={isLoading}
            className="chat-textarea"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
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
