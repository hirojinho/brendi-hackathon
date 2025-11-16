import { useState, useCallback, useEffect } from 'react';
import type { Message, ModelType, ChatRequest } from '../types';
import { chatService } from '../services/chatService';
import { settingsService } from '../services/settingsService';
import { noteService } from '../services/noteService';

interface UseChatOptions {
  initialModel?: ModelType;
  initialUseRag?: boolean;
  initialMaxChunks?: number;
}

export function useChat(options: UseChatOptions = {}) {
  const {
    initialModel,
    initialUseRag = false,
    initialMaxChunks = 5,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [model, setModel] = useState<ModelType>(initialModel || 'openai');
  const [modelName, setModelName] = useState<string>('');
  const [useRag, setUseRag] = useState(initialUseRag);
  const [maxChunks, setMaxChunks] = useState(initialMaxChunks);

  // Load saved provider and model from settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const settings = await settingsService.loadAllSettings();
        if (settings.provider) {
          setModel(settings.provider);
        }
        if (settings.modelName) {
          setModelName(settings.modelName);
        }
      } catch (error) {
        console.error('Failed to load saved settings:', error);
      }
    };
    loadSavedSettings();
  }, []);

  const sendMessage = useCallback(async (messageText?: string) => {
    const message = messageText || input.trim();
    if (!message || isLoading) return;

    const userMessage: Message = { role: 'user', content: message };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const request: ChatRequest = {
        message,
        history: messages,
        model,
        modelName: modelName || undefined,
        useRag,
        maxChunks: useRag ? maxChunks : undefined,
      };

      const result = await chatService.sendChat(request);
      
      setCurrentResponse(result.response);
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Clear currentResponse once message is added to prevent duplication
      setCurrentResponse('');
      
      // Automatically create notes from the question and response
      // Include both for better context extraction
      try {
        const contentForNote = `${message}\n\n${result.response}`;
        const noteResult = await noteService.createNote({
          content: contentForNote,
          model,
          modelName: modelName || undefined,
        });
        
        if (noteResult.notes && noteResult.notes.length > 0) {
          const noteCount = noteResult.notes.length;
          const noteMessage = noteCount === 1 
            ? `📝 Created 1 note: "${noteResult.notes[0].title || 'Untitled'}"`
            : `📝 Created ${noteCount} notes from this conversation`;
          
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: noteMessage 
          }]);
        }
      } catch (noteError) {
        // Silently fail note creation - don't interrupt the chat flow
        console.error('Note creation failed:', noteError);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get response';
      setCurrentResponse('');
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, model, modelName, useRag, maxChunks, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentResponse('');
    setInput('');
  }, []);

  return {
    // State
    messages,
    input,
    isLoading,
    currentResponse,
    model,
    modelName,
    useRag,
    maxChunks,
    // Setters
    setInput,
    setModel,
    setModelName,
    setUseRag,
    setMaxChunks,
    // Actions
    sendMessage,
    clearChat,
  };
}

