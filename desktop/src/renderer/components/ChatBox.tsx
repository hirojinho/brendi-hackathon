import React, { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import './ChatBox.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ChatBox: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [model, setModel] = useState<'openai' | 'openrouter' | 'ollama'>('openai');
  const [useRag, setUseRag] = useState(false);
  const [maxChunks, setMaxChunks] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const userMsg: Message = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setResponse('');

    try {
      const result = await window.electronAPI.sendChat({
        message: userMessage,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        model,
        useRag,
        maxChunks: useRag ? maxChunks : undefined,
      });

      setResponse(result.response);
      setMessages([...updatedMessages, { role: 'assistant', content: result.response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorMessage = error.message || 'Failed to get response';
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes('API key is not configured') || errorMessage.includes('No cookie auth credentials')) {
        errorMessage = `${errorMessage}\n\nTo configure API keys, edit the config file at:\n~/Library/Application Support/study-assistant-desktop/config.json\n\nOr set them via the Electron Store API (settings UI coming soon).`;
      }
      
      setResponse(`Error: ${errorMessage}`);
      // Also add error as a message so it's visible in the chat
      setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsNote = async () => {
    if (!response && messages.length === 0) return;

    const lastUserMsg = messages[messages.length - 1];
    const content = lastUserMsg && lastUserMsg.role === 'user'
      ? `${lastUserMsg.content}\n\n${response || 'No response yet'}`
      : response || '';

    if (content.length < 100) {
      alert('Note content must be at least 100 characters. Current response may be too short.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await window.electronAPI.createNote({
        content,
        model,
      });

      if (result.notes && result.notes.length > 0) {
        alert(`Created ${result.notes.length} note(s) successfully!`);
        setResponse('');
        setMessages([]);
      } else {
        alert('No notes were created. Content may be too short or invalid.');
      }
    } catch (error: any) {
      console.error('Note creation error:', error);
      alert(`Failed to create note: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h2>Study Assistant</h2>
        <div className="header-actions">
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="close-btn"
            onClick={() => window.electronAPI.toggleOverlay()}
            title="Close (ESC)"
          >
            ×
          </button>
        </div>
      </div>

      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <div className="chat-controls">
        <div className="control-group">
          <label>
            Model:
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value as any)}
              disabled={isLoading}
            >
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
        </div>
        
        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
              disabled={isLoading}
            />
            Use RAG
          </label>
        </div>

        {useRag && (
          <div className="control-group">
            <label>
              Max Chunks:
              <input
                type="number"
                min="1"
                max="20"
                value={maxChunks}
                onChange={(e) => setMaxChunks(parseInt(e.target.value) || 5)}
                disabled={isLoading}
              />
            </label>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        
        {isLoading && !response && (
          <div className="message message-assistant">
            <div className="message-content loading">Thinking...</div>
          </div>
        )}
        
        {response && (
          <div className="message message-assistant">
            <div className="message-content">{response}</div>
          </div>
        )}
      </div>

      {response && (
        <div className="chat-actions">
          <button
            onClick={handleSaveAsNote}
            disabled={isLoading}
            className="save-note-btn"
          >
            Save as Note
          </button>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question... (Press Enter to send)"
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;

