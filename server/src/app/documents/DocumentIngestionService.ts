import { PdfParserProvider, EmbeddingProvider } from '../../domain/ports/providers/index.js';
import { DocumentsRepository, DocumentChunksRepository } from '../../domain/ports/repositories/index.js';

export class DocumentIngestionService {
  constructor(
    private readonly pdfParser: PdfParserProvider,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly documentsRepository: DocumentsRepository,
    private readonly documentChunksRepository: DocumentChunksRepository,
    private readonly maxEmbeddingCharacters: number
  ) {}

  private createChunksFromText(text: string, chunkSize = 1500): string[] {
    const chunkList: string[] = [];

    for (let offset = 0; offset < text.length; offset += chunkSize) {
      chunkList.push(text.slice(offset, Math.min(offset + chunkSize, text.length)));
    }

    return chunkList;
  }

  async ingest(filePath: string, originalFileName: string): Promise<number> {
    const { title, pages, fullText } = await this.pdfParser.extract(filePath);

    const concatenatedPagesText = pages.join('\n');
    const chunkTexts = this.createChunksFromText(concatenatedPagesText);

    // Create the document and fetch its ID
    const documentId = this.documentsRepository.save({
      title,
      originalname: originalFileName,
      text: '',
      embedding: []
    });

    // Embed each chunk in parallel
    const embeddedChunkRecords = await Promise.all(
      chunkTexts.map(async (chunkText, chunkIndex) => ({
        chunkIndex,
        chunkText,
        embedding: await this.embeddingProvider.embed(chunkText)
      }))
    );

    this.documentChunksRepository.saveMany(documentId, embeddedChunkRecords);

    // Compute and save document-level embedding (with truncation safeguard)
    let documentEmbeddingText = fullText;
    if (documentEmbeddingText.length > this.maxEmbeddingCharacters) {
      documentEmbeddingText = documentEmbeddingText.slice(0, this.maxEmbeddingCharacters);
    }

    const documentEmbedding = await this.embeddingProvider.embed(documentEmbeddingText);
    this.documentsRepository.updateEmbeddingAndText(documentId, documentEmbedding, fullText);

    return documentId;
  }
}


