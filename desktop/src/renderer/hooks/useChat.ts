import { useState, useCallback, useEffect } from 'react';
import type { Message, ModelType, ChatRequest } from '../types';
import { chatService } from '../services/chatService';
import { settingsService } from '../services/settingsService';

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
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to get response';
      setCurrentResponse(`Error: ${errorMessage}`);
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

