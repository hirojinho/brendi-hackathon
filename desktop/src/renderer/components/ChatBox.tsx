import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatHeader, ChatControls } from './layout';
import { ChatMessages, ChatInput } from './chat';
import SettingsPanel from './SettingsPanel';
import './ChatBox.css';

const ChatBox: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  const {
    messages,
    input,
    isLoading,
    currentResponse,
    model,
    // modelName, // Unused
    useRag,
    maxChunks,
    setInput,
    setModel,
    setUseRag,
    setMaxChunks,
    sendMessage,
    // clearChat, // Unused
  } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

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

      <ChatControls
        model={model}
        useRag={useRag}
        maxChunks={maxChunks}
        isLoading={isLoading}
        onModelChange={setModel}
        onUseRagChange={setUseRag}
        onMaxChunksChange={setMaxChunks}
      />

      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        currentResponse={currentResponse}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
};

export default ChatBox;
