import React from 'react';
import { ChatContainer } from '../../features/chat/components/ChatContainer';
import './DesktopChatPanel.css';

interface DesktopChatPanelProps {
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
  embeddingProvider: 'openai' | 'ollama';
}

/**
 * Desktop Chat Panel - Wrapper for ChatContainer
 * Maintains backward compatibility with existing props
 */
export const DesktopChatPanel: React.FC<DesktopChatPanelProps> = ({
  model,
  modelName,
}) => {
  return <ChatContainer model={model} modelName={modelName} />;
};
