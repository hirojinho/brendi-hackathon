import { LLMProvider, ChatMessage } from '../../../domain/ports/providers/index.js';
import { getChatSystemPrompt } from '../../../domain/prompts/system.js';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  private openAIClient: OpenAI;
  private defaultModelName: string;

  constructor(apiKey?: string, modelName: string = 'gpt-4.1-mini') {
    this.openAIClient = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
    this.defaultModelName = modelName;
  }

  async generateResponse(userMessage: string, messageHistory: ChatMessage[] = [], _modelName?: string): Promise<string> {
    const chatMessages = [
      { role: 'system', content: getChatSystemPrompt() },
      ...messageHistory.map(entry => ({ role: (entry.role === 'assistant' ? 'assistant' : 'user'), content: entry.content })),
      { role: 'user', content: userMessage }
    ];

    const completionResponse = await this.openAIClient.chat.completions.create({
      model: this.defaultModelName,
      messages: chatMessages as any,
      temperature: 0.7
    });

    return completionResponse.choices[0]?.message?.content || '';
  }
}


