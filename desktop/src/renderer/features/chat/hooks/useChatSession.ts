import { useState, useCallback, useEffect } from 'react';
import { chatRepository } from '../data/chatRepository';
import { ChatSession } from '../domain/ChatSession';
import { Message } from '../domain/Message';
import type { ModelType } from '../../../types/chat';
import { settingsService } from '../../../services/settingsService';

interface UseChatSessionOptions {
  initialModel?: ModelType;
  initialUseRag?: boolean;
  initialMaxChunks?: number;
}

/**
 * Hook for managing chat session
 */
export function useChatSession(options: UseChatSessionOptions = {}) {
  const {
    initialModel,
    initialUseRag = false,
    initialMaxChunks = 5,
  } = options;

  const [session, setSession] = useState<ChatSession>(() => 
    new ChatSession([], initialModel || 'openai', '', initialUseRag, initialMaxChunks)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState<string>('');

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.loadAllSettings();
        if (settings.provider || settings.modelName) {
          setSession(prev => prev.updateSettings({
            model: settings.provider,
            modelName: settings.modelName || '',
          }));
        }
      } catch (err) {
        console.error('Failed to load chat settings:', err);
      }
    };
    loadSettings();
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = new Message('user', messageText);
    setSession(prev => prev.addMessage(userMessage));
    setIsLoading(true);
    setError(null);
    setCurrentResponse('');

    try {
      const response = await chatRepository.sendMessage(messageText, session);
      
      setCurrentResponse(response.response);
      const assistantMessage = new Message('assistant', response.response);
      setSession(prev => prev.addMessage(assistantMessage));
      setCurrentResponse('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [session, isLoading]);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage = new Message('system', content);
    setSession(prev => prev.addMessage(systemMessage));
  }, []);

  const clearMessages = useCallback(() => {
    setSession(prev => prev.clear());
    setError(null);
  }, []);

  const updateSettings = useCallback((settings: {
    model?: ModelType;
    modelName?: string;
    useRag?: boolean;
    maxChunks?: number;
  }) => {
    setSession(prev => prev.updateSettings(settings));
  }, []);

  return {
    session,
    messages: session.messages,
    isLoading,
    error,
    currentResponse,
    model: session.model,
    modelName: session.modelName,
    useRag: session.useRag,
    maxChunks: session.maxChunks,
    sendMessage,
    addSystemMessage,
    clearMessages,
    updateSettings,
    clearError: () => setError(null),
  };
}
