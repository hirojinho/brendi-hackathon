import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import fetch from 'node-fetch';

export class OllamaProvider implements LLMProvider {
  constructor(private readonly baseUrl: string = 'http://localhost:11434') {}

  async generateResponse(message: string, history: ChatMessage[] = [], modelName?: string): Promise<string> {
    const model = modelName || 'phi3:latest';
    const messages = history && history.length > 0
      ? history
      : [
          { role: 'system' as const, content: getChatSystemPrompt() },
          { role: 'user' as const, content: message }
        ];

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false })
    });
    if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`);
    const data = await res.json() as any;
    return data.message?.content || data.content || '';
  }
}


