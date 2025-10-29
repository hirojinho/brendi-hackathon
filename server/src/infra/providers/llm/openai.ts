import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  constructor(apiKey?: string, model: string = 'gpt-4.1-mini') {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.model = model;
  }

  async generateResponse(message: string, history: ChatMessage[] = [], _modelName?: string): Promise<string> {
    const messages = [
      { role: 'system', content: getChatSystemPrompt() },
      ...history.map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user'), content: m.content })),
      { role: 'user', content: message }
    ];
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: 0.7
    });
    return res.choices[0]?.message?.content || '';
  }
}


