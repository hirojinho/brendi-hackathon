import { LLMProvider, ChatMessage } from '../../domain/ports/providers/index.js';

export interface ChatRequestInput {
  message: string;
  history?: ChatMessage[];
  model: 'openrouter' | 'openai' | 'ollama';
  modelName?: string;
  useRag?: boolean;
}

export class ChatService {
  private readonly providerByModel: Record<string, LLMProvider>;

  constructor(providers: { openrouter: LLMProvider; openai: LLMProvider; ollama: LLMProvider }) {
    this.providerByModel = providers;
  }

  async respond(input: ChatRequestInput, prompt: string): Promise<string> {
    const provider = this.providerByModel[input.model];
    if (!provider) throw new Error(`Unsupported model: ${input.model}`);
    return provider.generateResponse(prompt, input.history, input.modelName);
  }
}


