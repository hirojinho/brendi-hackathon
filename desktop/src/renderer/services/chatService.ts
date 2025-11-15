import type { ChatRequest, ChatResponse } from '../types';

export class ChatService {
  async sendChat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const result = await window.electronAPI.sendChat(request);
      return result;
    } catch (error: any) {
      const errorMessage = this.formatErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  private formatErrorMessage(error: any): string {
    let errorMessage = error.message || 'Failed to get response';
    
    if (
      errorMessage.includes('API key is not configured') ||
      errorMessage.includes('No cookie auth credentials')
    ) {
      errorMessage = `${errorMessage}\n\nTo configure API keys, open the settings panel (⚙️ icon).`;
    }
    
    return errorMessage;
  }
}

export const chatService = new ChatService();

