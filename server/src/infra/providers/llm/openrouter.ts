import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import fetch from 'node-fetch';

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;

  constructor(apiKey: string = process.env.OPENROUTER_API_KEY || '') {
    this.apiKey = apiKey;
  }

  async generateResponse(userMessage: string, messageHistory: ChatMessage[] = [], modelName?: string): Promise<string> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('OpenRouter API key is not configured. Please set OPENROUTER_API_KEY environment variable or configure it in the app settings.');
    }

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
      let errorMessage = `OpenRouter API error: ${errorText}`;
      
      if (httpResponse.status === 401) {
        errorMessage = 'OpenRouter API key is invalid or expired. Please check your API key in settings.';
      } else if (httpResponse.status === 429) {
        errorMessage = 'OpenRouter rate limit exceeded. Please try again later.';
      }
      
      throw new Error(errorMessage);
    }

    const completion = await httpResponse.json() as any;
    return completion.choices?.[0]?.message?.content || '';
  }
}


