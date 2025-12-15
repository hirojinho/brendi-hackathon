import React, { useState, useEffect } from 'react';
import { useChatSession } from '../hooks/useChatSession';
import { ChatView } from './ChatView';
import type { ModelType } from '../../../types/chat';

interface ChatContainerProps {
  model: ModelType;
  modelName?: string;
}

/**
 * Container component for Chat
 * Handles business logic and coordinates with hooks
 */
export const ChatContainer: React.FC<ChatContainerProps> = ({
  model,
  modelName,
}) => {
  const [input, setInput] = useState('');
  
  const {
    messages,
    isLoading,
    currentResponse,
    model: chatModel,
    modelName: chatModelName,
    useRag,
    maxChunks,
    sendMessage: sendChatMessage,
    updateSettings,
  } = useChatSession({
    initialModel: model,
  });

  // Update chat model when prop changes
  useEffect(() => {
    updateSettings({
      model,
      modelName: modelName || undefined,
    });
  }, [model, modelName, updateSettings]);

  const handleSendMessage = () => {
    if (input.trim()) {
      sendChatMessage(input);
      setInput('');
    }
  };

  return (
    <ChatView
      messages={messages}
      input={input}
      isLoading={isLoading}
      currentResponse={currentResponse}
      useRag={useRag}
      maxChunks={maxChunks}
      onInputChange={setInput}
      onSendMessage={handleSendMessage}
      onUseRagChange={(useRag) => updateSettings({ useRag })}
      onMaxChunksChange={(maxChunks) => updateSettings({ maxChunks })}
    />
  );
};
