import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { OpenAI } from 'openai';
import DocumentDatabase from './documentDatabase.js';

// Configuration constants
export const UPLOAD_CONFIG = {
  MAX_EMBEDDING_CHARS: 512,
  CHUNK_SIZE: 1500,
  CHUNK_OVERLAP: 200,
  OPENAI_BATCH_SIZE: 16,
  OLLAMA_BATCH_SIZE: 4,
  CONCURRENCY_LIMIT: 3,
  PROGRESS_LOG_INTERVAL: 50,
} as const;

// Types
export interface UploadRequest {
  file: Express.Multer.File;
  embeddingProvider: 'openai' | 'ollama';
}

export interface UploadProgress {
  status: string;
  progress: number;
  error?: string;
  chunk?: number;
  totalChunks?: number;
  subChunk?: number;
  totalSubChunks?: number;
  splitChunks?: number;
}

export interface DocumentChunk {
  chunk_index: number;
  chunk_text: string;
}

export interface ProcessedDocument {
  id: number;
  title: string;
  originalname: string;
  uploadId: string;
}

// Global upload status tracking
const uploadStatus: Record<string, UploadProgress> = {};

// Helper functions
export function generateUploadId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now();
}

export function updateUploadStatus(uploadId: string, update: Partial<UploadProgress>): void {
  uploadStatus[uploadId] = { ...uploadStatus[uploadId], ...update };
}

export function getUploadStatus(uploadId: string): UploadProgress {
  return uploadStatus[uploadId] || { status: 'Unknown upload', progress: 0 };
}

// Validation
export function validateUploadRequest(req: any): UploadRequest {
  if (!req.file) {
    throw new Error('No file uploaded');
  }

  const embeddingProvider = req.body.embeddingProvider === 'ollama' ? 'ollama' : 'openai';
  
  return {
    file: req.file,
    embeddingProvider
  };
}

// PDF Processing
export async function extractTextFromPDF(filePath: string): Promise<{
  title: string;
  pages: string[];
  fullText: string;
}> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Use pdfjsLib.getDocument safely for Node.js
    const getDocument = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
    if (!getDocument) {
      throw new Error('pdfjsLib.getDocument is not available');
    }
    
    const loadingTask = getDocument({ data: dataBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    const pages: string[] = [];
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = (content.items as { str?: string }[])
        .map((item) => (item.str || ''))
        .join(' ');
      
      pages.push(pageText);
      fullText += pageText + ' ';
    }
    
    return {
      title: path.basename(filePath, '.pdf'),
      pages,
      fullText: fullText.trim()
    };
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Text Chunking
export function createDocumentChunks(pages: string[]): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];
  
  for (const pageText of pages) {
    for (let i = 0; i < pageText.length; i += UPLOAD_CONFIG.CHUNK_SIZE - UPLOAD_CONFIG.CHUNK_OVERLAP) {
      const chunkText = pageText.slice(i, i + UPLOAD_CONFIG.CHUNK_SIZE);
      if (chunkText.trim()) {
        allChunks.push({
          chunk_index: allChunks.length,
          chunk_text: chunkText
        });
      }
    }
  }
  
  return allChunks;
}

// Helper to batch an array
export function batchArray<T>(arr: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

// Embedding Generation
export async function generateEmbeddings(
  chunks: DocumentChunk[],
  provider: 'openai' | 'ollama',
  uploadId: string,
  openai: OpenAI,
  getOllamaEmbedding: (text: string) => Promise<number[]>
): Promise<Array<{ chunk: DocumentChunk; embedding: number[] }>> {
  const batchSize = provider === 'openai' 
    ? UPLOAD_CONFIG.OPENAI_BATCH_SIZE 
    : UPLOAD_CONFIG.OLLAMA_BATCH_SIZE;
  
  const batches = batchArray(chunks, batchSize);
  const results: Array<{ chunk: DocumentChunk; embedding: number[] }> = [];
  let processedChunks = 0;

  // Process batches with concurrency control
  const processBatch = async (batch: DocumentChunk[]): Promise<void> => {
    let embeddings: number[][] = [];
    
    if (provider === 'openai') {
      // Batch request for OpenAI
      const texts = batch.map(c => c.chunk_text.slice(0, UPLOAD_CONFIG.MAX_EMBEDDING_CHARS));
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts
      });
      embeddings = embeddingRes.data.map(d => d.embedding);
    } else {
      // Ollama: parallel requests for each chunk in the batch
      embeddings = await Promise.all(
        batch.map(c => getOllamaEmbedding(c.chunk_text.slice(0, UPLOAD_CONFIG.MAX_EMBEDDING_CHARS)))
      );
    }

    // Store results
    for (let i = 0; i < batch.length; i++) {
      results.push({
        chunk: batch[i],
        embedding: embeddings[i]
      });
      processedChunks++;
    }

    // Update progress
    updateUploadStatus(uploadId, {
      status: `Embedded ${processedChunks} of ${chunks.length} chunks...`,
      progress: 10 + Math.floor(80 * (processedChunks / chunks.length)),
      chunk: processedChunks,
      totalChunks: chunks.length
    });

    // Log progress
    if (processedChunks % UPLOAD_CONFIG.PROGRESS_LOG_INTERVAL === 0) {
      console.log(`[Upload] Processed ${processedChunks} of ${chunks.length} chunks...`);
    }
  };

  // Concurrency control (simple pool)
  const runBatches = async (): Promise<void> => {
    let idx = 0;
    const pool: Promise<void>[] = [];

    while (idx < batches.length) {
      while (pool.length < UPLOAD_CONFIG.CONCURRENCY_LIMIT && idx < batches.length) {
        const p = processBatch(batches[idx]);
        pool.push(p);
        idx++;
      }
      await Promise.race(pool);
      // Remove the first resolved promise from the pool
      pool.shift();
    }
    await Promise.all(pool);
  };

  await runBatches();
  return results;
}

// Document Storage
export async function storeDocument(
  documentData: {
    title: string;
    originalname: string;
    fullText: string;
  },
  embeddedChunks: Array<{ chunk: DocumentChunk; embedding: number[] }>,
  provider: 'openai' | 'ollama',
  uploadId: string,
  documentDb: DocumentDatabase,
  getEmbedding: (text: string, provider: 'openai' | 'ollama') => Promise<number[]>
): Promise<number> {
  try {
    // Save document first to get ID
    const docId = documentDb.saveDocument({
      title: documentData.title,
      originalname: documentData.originalname,
      embedding: [], // Will be updated later
      text: ''
    });

    // Save all chunks
    const chunkData = embeddedChunks.map(({ chunk, embedding }) => ({
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      embedding
    }));

    documentDb.saveChunks(docId, chunkData);

    // Generate document-level embedding
    let docEmbeddingText = documentData.fullText;
    if (docEmbeddingText.length > UPLOAD_CONFIG.MAX_EMBEDDING_CHARS) {
      console.warn('[Embedding] Document text truncated for embedding.');
      docEmbeddingText = docEmbeddingText.slice(0, UPLOAD_CONFIG.MAX_EMBEDDING_CHARS);
    }

    const docEmbedding = await getEmbedding(docEmbeddingText, provider);
    documentDb.updateDocumentEmbeddingAndText(docId, docEmbedding, documentData.fullText);

    updateUploadStatus(uploadId, { status: 'Upload complete!', progress: 100 });
    
    return docId;
  } catch (error) {
    console.error('[Storage] Error storing document:', error);
    throw new Error('Failed to store document');
  }
}

// Cleanup
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('[Cleanup] Error removing temp file:', error);
  }
}

// Main Upload Processing Function
export async function processDocumentUpload(
  request: UploadRequest,
  uploadId: string,
  dependencies: {
    documentDb: DocumentDatabase;
    openai: OpenAI;
    getOllamaEmbedding: (text: string) => Promise<number[]>;
    getEmbedding: (text: string, provider: 'openai' | 'ollama') => Promise<number[]>;
  }
): Promise<ProcessedDocument> {
  const { file, embeddingProvider } = request;
  const { documentDb, openai, getOllamaEmbedding, getEmbedding } = dependencies;

  try {
    // Update status: Extracting text
    updateUploadStatus(uploadId, { status: 'Extracting text...', progress: 10 });

    // Extract text from PDF
    const { title, pages, fullText } = await extractTextFromPDF(file.path);

    // Create chunks
    const chunks = createDocumentChunks(pages);
    console.log(`[Upload] Created ${chunks.length} chunks for processing`);

    // Generate embeddings
    const embeddedChunks = await generateEmbeddings(
      chunks,
      embeddingProvider,
      uploadId,
      openai,
      getOllamaEmbedding
    );

    // Store document and chunks
    const docId = await storeDocument(
      { title, originalname: file.originalname, fullText },
      embeddedChunks,
      embeddingProvider,
      uploadId,
      documentDb,
      getEmbedding
    );

    // Cleanup
    cleanupTempFile(file.path);

    return {
      id: docId,
      title,
      originalname: file.originalname,
      uploadId
    };

  } catch (error) {
    // Cleanup on error
    cleanupTempFile(file.path);
    throw error;
  }
}

// Error Handling
export function handleUploadError(error: unknown, uploadId: string, res: Response): void {
  console.error('[Upload] Error:', error);
  
  let errorMessage = 'Failed to process document';
  let statusCode = 500;

  if (error instanceof Error) {
    if (error.message.includes('No file uploaded')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('Failed to extract text')) {
      errorMessage = 'Invalid PDF file or corrupted document';
      statusCode = 400;
    }
  }

  updateUploadStatus(uploadId, {
    status: 'Error',
    progress: 0,
    error: errorMessage
  });

  res.status(statusCode).json({
    error: errorMessage,
    uploadId
  });
}

// Export upload status for external access
export { uploadStatus }; 