import fetch from 'node-fetch';
import { EmbeddingProvider } from '../../../domain/ports/providers/index.js';

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly baseUrl: string = 'http://localhost:11434') {}

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'zylonai/multilingual-e5-large', prompt: text })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama embedding failed: ${err}`);
    }
    const data = await res.json() as { embedding: number[] };
    if (!data.embedding) throw new Error('No embedding in Ollama response');
    return data.embedding;
  }
}


