import { PdfParserProvider, EmbeddingProvider } from '../../domain/ports/providers/index.js';
import { DocumentsRepository, DocumentChunksRepository } from '../../domain/ports/repositories/index.js';

export class DocumentIngestionService {
  constructor(
    private readonly pdf: PdfParserProvider,
    private readonly embeddings: EmbeddingProvider,
    private readonly documentsRepo: DocumentsRepository,
    private readonly chunksRepo: DocumentChunksRepository,
    private readonly maxEmbeddingChars: number
  ) {}

  private chunkText(text: string, chunkSize = 1500): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, Math.min(i + chunkSize, text.length)));
    }
    return chunks;
  }

  async ingest(filePath: string, originalname: string): Promise<number> {
    const { title, pages, fullText } = await this.pdf.extract(filePath);
    const pageText = pages.join('\n');
    const chunks = this.chunkText(pageText);

    // Save document placeholder to get id
    const docId = this.documentsRepo.save({
      title,
      originalname,
      text: '',
      embedding: [],
      createdAt: new Date().toISOString(),
      id: 0
    });

    // Embed chunks
    const embedded = await Promise.all(chunks.map(async (text, idx) => ({
      chunkIndex: idx,
      chunkText: text,
      embedding: await this.embeddings.embed(text)
    })));

    this.chunksRepo.saveMany(docId, embedded);

    // Document-level embedding (possibly truncated)
    let docEmbeddingText = fullText;
    if (docEmbeddingText.length > this.maxEmbeddingChars) {
      docEmbeddingText = docEmbeddingText.slice(0, this.maxEmbeddingChars);
    }
    const docEmbedding = await this.embeddings.embed(docEmbeddingText);
    this.documentsRepo.updateEmbeddingAndText(docId, docEmbedding, fullText);

    return docId;
  }
}


