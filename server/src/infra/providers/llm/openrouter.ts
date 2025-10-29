import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import fetch from 'node-fetch';

export class OpenRouterProvider implements LLMProvider {
  constructor(private readonly apiKey: string = process.env.OPENROUTER_API_KEY || '') {}

  async generateResponse(message: string, history: ChatMessage[] = [], modelName?: string): Promise<string> {
    const model = modelName || 'meta-llama/llama-3.3-8b-instruct:free';
    const messages = [
      { role: 'system', content: getChatSystemPrompt() },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: message }
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Study Assistant'
      },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }
}


