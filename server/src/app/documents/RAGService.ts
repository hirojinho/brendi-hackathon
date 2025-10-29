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
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly documentChunksRepository: DocumentChunksRepository,
    private readonly usageRepository: UsageRepository,
    private readonly similarityThreshold: number,
    private readonly fallbackChunkCount: number
  ) {}

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    let dotProduct = 0;
    let vectorANorm = 0;
    let vectorBNorm = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      vectorANorm += vectorA[i] * vectorA[i];
      vectorBNorm += vectorB[i] * vectorB[i];
    }

    return dotProduct / (Math.sqrt(vectorANorm) * Math.sqrt(vectorBNorm));
  }

  async retrieve(userMessage: string, maxChunks: number): Promise<ScoredChunk[]> {
    const queryEmbedding = await this.embeddingProvider.embed(userMessage);
    const allChunks = this.documentChunksRepository.getAll();

    const scoredChunks = allChunks.map(chunk => ({
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      documentId: chunk.documentId,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    const chunksAboveThreshold = scoredChunks.filter(scored => scored.similarity >= this.similarityThreshold);

    if (chunksAboveThreshold.length === 0) {
      return scoredChunks
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, this.fallbackChunkCount);
    }

    return chunksAboveThreshold
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, maxChunks);
  }

  logUsage(documentId: number, chunkIndexes: number[], responseExcerpt: string): void {
    this.usageRepository.log({ documentId, chunkIndexes, responseExcerpt });
  }
}


