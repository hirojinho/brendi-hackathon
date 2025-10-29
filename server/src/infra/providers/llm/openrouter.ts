import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import fetch from 'node-fetch';

export class OpenRouterProvider implements LLMProvider {
  constructor(private readonly apiKey: string = process.env.OPENROUTER_API_KEY || '') {}

  async generateResponse(userMessage: string, messageHistory: ChatMessage[] = [], modelName?: string): Promise<string> {
    const effectiveModelName = modelName || 'meta-llama/llama-3.3-8b-instruct:free';

    const chatMessages = [
      { role: 'system', content: getChatSystemPrompt() },
      ...messageHistory.map(entry => ({ role: entry.role === 'assistant' ? 'assistant' : 'user', content: entry.content })),
      { role: 'user', content: userMessage }
    ];

    const httpResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Study Assistant'
      },
      body: JSON.stringify({ model: effectiveModelName, messages: chatMessages, temperature: 0.7 })
    });

    if (!httpResponse.ok) {
      const errorText = await httpResponse.text();
      throw new Error(`OpenRouter error: ${errorText}`);
    }

    const completion = await httpResponse.json() as any;
    return completion.choices?.[0]?.message?.content || '';
  }
}


