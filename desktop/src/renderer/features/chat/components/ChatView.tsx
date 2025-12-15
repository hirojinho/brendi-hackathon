import React from 'react';
import { Message } from '../domain/Message';
import { MarkdownRenderer } from '../../../components/common/MarkdownRenderer';
import '../../../components/desktop/DesktopChatPanel.css';

interface ChatViewProps {
  messages: readonly Message[];
  input: string;
  isLoading: boolean;
  currentResponse: string;
  useRag: boolean;
  maxChunks: number;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onUseRagChange: (useRag: boolean) => void;
  onMaxChunksChange: (maxChunks: number) => void;
}

/**
 * Presentational component for Chat
 * Pure UI component - no business logic
 */
export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  input,
  isLoading,
  currentResponse,
  useRag,
  maxChunks,
  onInputChange,
  onSendMessage,
  onUseRagChange,
  onMaxChunksChange,
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, currentResponse, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage();
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

          {messages.map((message, index) => {
            const messageData = message.toData ? message.toData() : message;
            return (
              <div
                key={index}
                className={`chat-message ${messageData.role}`}
              >
                <div className="message-content">
                  {messageData.role === 'assistant' ? (
                    <MarkdownRenderer content={messageData.content} />
                  ) : (
                    <p>{messageData.content}</p>
                  )}
                </div>
              </div>
            );
          })}

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
              onChange={(e) => onUseRagChange(e.target.checked)}
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
                onChange={(e) => onMaxChunksChange(parseInt(e.target.value) || 5)}
                className="chunks-input"
              />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type your message... (⌘⏎ to send)"
            disabled={isLoading}
            className="chat-textarea"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                onSendMessage();
              }
            }}
            rows={3}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="chat-send-button"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
