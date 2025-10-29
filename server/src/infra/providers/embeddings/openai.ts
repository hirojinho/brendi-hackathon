import OpenAI from 'openai';
import { EmbeddingProvider } from '../../../domain/ports/providers/index.js';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000)
    });
    return res.data[0].embedding as unknown as number[];
  }
}


