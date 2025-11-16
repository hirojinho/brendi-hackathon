import React from 'react';
import { ChatMessage } from './ChatMessage';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import type { Message } from '../../types';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  currentResponse: string;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  currentResponse,
}) => {
  return (
    <div className="chat-messages">
      {messages.map((msg, idx) => (
        <ChatMessage key={idx} message={msg} />
      ))}
      
      {isLoading && (
        <div className="message message-assistant">
          <div className="message-content">
            {currentResponse ? (
              <MarkdownRenderer content={currentResponse} />
            ) : (
              <div className="loading">Thinking...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

