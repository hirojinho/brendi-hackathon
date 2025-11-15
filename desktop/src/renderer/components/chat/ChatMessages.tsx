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
      
      {isLoading && !currentResponse && (
        <div className="message message-assistant">
          <div className="message-content loading">Thinking...</div>
        </div>
      )}
      
      {currentResponse && (
        <div className="message message-assistant">
          <div className="message-content">
            <MarkdownRenderer content={currentResponse} />
          </div>
        </div>
      )}
    </div>
  );
};

