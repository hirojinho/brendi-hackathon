import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import fetch from 'node-fetch';

export class OllamaProvider implements LLMProvider {
  constructor(private readonly baseUrl: string = 'http://localhost:11434') {}

  async generateResponse(userMessage: string, messageHistory: ChatMessage[] = [], modelName?: string): Promise<string> {
    const effectiveModelName = modelName || 'phi3:latest';

    const chatMessages = (messageHistory && messageHistory.length > 0)
      ? messageHistory
      : [
          { role: 'system', content: getChatSystemPrompt() },
          { role: 'user', content: userMessage }
        ];

    const httpResponse = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: effectiveModelName, messages: chatMessages, stream: false })
    });

    if (!httpResponse.ok) {
      const errorText = await httpResponse.text();
      throw new Error(`Ollama error: ${errorText}`);
    }

    const completion = await httpResponse.json() as any;
    return completion.message?.content || completion.content || '';
  }
}


