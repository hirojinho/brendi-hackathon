import { EmbeddingProvider } from '../../domain/ports/providers/index.js';
import { DocumentChunksRepository, UsageRepository } from '../../domain/ports/repositories/index.js';

export interface ScoredChunk {
  chunkIndex: number;
  chunkText: string;
  similarity: number;
  documentId: number;
}

export class RAGService {
  constructor(
    private readonly embeddings: EmbeddingProvider,
    private readonly chunksRepo: DocumentChunksRepository,
    private readonly usageRepo: UsageRepository,
    private readonly similarityThreshold: number,
    private readonly fallbackChunks: number
  ) {}

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async retrieve(message: string, maxChunks: number): Promise<ScoredChunk[]> {
    const queryEmbedding = await this.embeddings.embed(message);
    const all = this.chunksRepo.getAll();
    const scored = all.map(c => ({
      chunkIndex: c.chunkIndex,
      chunkText: c.chunkText,
      documentId: c.documentId,
      similarity: this.cosineSimilarity(queryEmbedding, c.embedding)
    }));

    let filtered = scored.filter(s => s.similarity >= this.similarityThreshold);
    if (filtered.length === 0) {
      return scored.sort((a, b) => b.similarity - a.similarity).slice(0, this.fallbackChunks);
    }
    return filtered.sort((a, b) => b.similarity - a.similarity).slice(0, maxChunks);
  }

  logUsage(documentId: number, chunkIndexes: number[], responseExcerpt: string): void {
    this.usageRepo.log({ documentId, chunkIndexes, responseExcerpt });
  }
}


