import React from 'react';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import type { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div className={`message message-${message.role}`}>
      <div className="message-content">
        {message.role === 'assistant' ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          message.content
        )}
      </div>
    </div>
  );
};

