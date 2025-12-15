import { chatService } from '../../../services/chatService';
import { ChatSession } from '../domain/ChatSession';
import { Message } from '../domain/Message';
import type { ChatRequest, ChatResponse, ModelType } from '../../../types/chat';

/**
 * Repository interface for chat data access
 */
export interface ChatRepository {
  sendMessage(
    message: string,
    session: ChatSession
  ): Promise<ChatResponse>;
}

/**
 * Implementation of ChatRepository
 */
export class ChatRepositoryImpl implements ChatRepository {
  async sendMessage(
    message: string,
    session: ChatSession
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      history: session.getHistoryForAPI(),
      model: session.model,
      modelName: session.modelName || undefined,
      useRag: session.useRag,
      maxChunks: session.useRag ? session.maxChunks : undefined,
    };

    return await chatService.sendChat(request);
  }
}

// Export singleton instance
export const chatRepository: ChatRepository = new ChatRepositoryImpl();
