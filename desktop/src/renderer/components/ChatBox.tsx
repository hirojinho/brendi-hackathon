import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { noteService } from '../services/noteService';
import { ChatHeader, ChatControls } from './layout';
import { ChatMessages, ChatInput, ChatActions } from './chat';
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
    modelName,
    useRag,
    maxChunks,
    setInput,
    setModel,
    setUseRag,
    setMaxChunks,
    sendMessage,
    clearChat,
  } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleSaveAsNote = async () => {
    if (!currentResponse && messages.length === 0) return;

    const lastUserMsg = messages[messages.length - 1];
    const content = lastUserMsg && lastUserMsg.role === 'user'
      ? `${lastUserMsg.content}\n\n${currentResponse || 'No response yet'}`
      : currentResponse || '';

    const validation = noteService.validateNoteContent(content);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      const result = await noteService.createNote({
        content,
        model,
        modelName: modelName || undefined,
      });

      if (result.notes && result.notes.length > 0) {
        alert(`Created ${result.notes.length} note(s) successfully!`);
        clearChat();
      } else {
        alert('No notes were created. Content may be too short or invalid.');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create note');
    }
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

      {currentResponse && (
        <ChatActions
          onSaveAsNote={handleSaveAsNote}
          isLoading={isLoading}
        />
      )}

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
