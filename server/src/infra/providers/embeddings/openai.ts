import OpenAI from 'openai';
import { EmbeddingProvider } from '../../../domain/ports/providers/index.js';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI | null = null;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    // Only create client if API key is available
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable or provide an API key.');
    }

    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    });
    return res.data[0].embedding as unknown as number[];
  }
}


