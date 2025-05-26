import { Request, Response } from 'express';
import { generateGeminiResponse } from './gemini.js';
import { generateDeepseekResponse } from './deepseek.js';
import { generateOpenAIResponse } from './openai.js';
import { generateLocalResponse } from './local.js';
import DocumentDatabase from './documentDatabase.js';

// Configuration constants
export const RAG_CONFIG = {
  SIMILARITY_THRESHOLD: 0.7,
  DEFAULT_MAX_CHUNKS: 5,
  FALLBACK_CHUNKS: 3,
} as const;

// Types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatRequest {
  message: string;
  history?: Array<{ role: MessageRole; content: string }>;
  model?: 'gemini' | 'openai' | 'local' | 'deepseek';
  useRag?: boolean;
  maxChunks?: number;
}

export interface ChatResponse {
  response: string;
  retrievedChunks?: Array<{
    documentId: number;
    chunkIndex: number;
    text: string;
    similarity: number;
  }>;
}

export interface RAGChunk {
  chunk_index: number;
  chunk_text: string;
  document_id: number;
  embedding: number[];
  similarity?: number;
}

// Validation
export function validateChatRequest(body: any): ChatRequest {
  const { message, history, model = 'gemini', useRag = false, maxChunks = RAG_CONFIG.DEFAULT_MAX_CHUNKS } = body;

  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }

  if (model && !['gemini', 'openai', 'local', 'deepseek'].includes(model)) {
    throw new Error('Invalid model specified');
  }

  return { message, history, model, useRag, maxChunks };
}

// RAG Processing
export async function processRAGQuery(
  message: string, 
  maxChunks: number,
  documentDb: DocumentDatabase,
  getOllamaEmbedding: (text: string) => Promise<number[]>,
  cosineSimilarity: (a: number[], b: number[]) => number
): Promise<RAGChunk[]> {
  try {
    // Compute embedding for the user message
    const queryEmbedding = await getOllamaEmbedding(message);
    
    // Retrieve and score all document chunks
    const allChunks = documentDb.getAllChunks();
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));

    // Filter by threshold
    let filteredChunks = scoredChunks.filter(chunk => 
      chunk.similarity >= RAG_CONFIG.SIMILARITY_THRESHOLD
    );

    // Fallback to top chunks if none meet threshold
    if (filteredChunks.length === 0) {
      filteredChunks = scoredChunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, RAG_CONFIG.FALLBACK_CHUNKS);
    } else {
      filteredChunks = filteredChunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxChunks);
    }

    // Log similarity scores
    logChunkSimilarities(filteredChunks);

    return filteredChunks;
  } catch (error) {
    console.error('[RAG] Error processing query:', error);
    return [];
  }
}

function logChunkSimilarities(chunks: RAGChunk[]): void {
  if (chunks.length === 0) return;
  
  console.log('\nRetrieved chunks similarity scores:');
  chunks.forEach((chunk, index) => {
    const similarity = ((chunk.similarity || 0) * 100).toFixed(2);
    console.log(`Chunk ${index + 1} (doc_id: ${chunk.document_id}, chunk_index: ${chunk.chunk_index}): ${similarity}%`);
  });
  console.log('---\n');
}

// Prompt Generation
export function createRAGPrompt(message: string, chunks: RAGChunk[]): string {
  const sources = chunks.map((chunk, i) => 
    `[Source ${i + 1}] ${chunk.chunk_text}`
  ).join('\n\n');

  return `Based on the following sources, please provide a response. For each piece of information you use, cite the source number (e.g., [Source 1], [Source 2], etc.).

Format all math using LaTeX (use $...$ for inline math and $$...$$ for block math), and use Markdown for all formatting (italics, bold, lists, etc.). Separate paragraphs with double newlines.

Sources:
${sources}

User question: ${message}

Please provide a comprehensive response that directly references the sources above.`;
}

// Response Generation
export async function generateResponse(
  request: ChatRequest,
  ragChunks: RAGChunk[] = []
): Promise<string> {
  const { message, history = [], model, useRag } = request;
  
  // Prepare prompt
  const prompt = useRag && ragChunks.length > 0 
    ? createRAGPrompt(message, ragChunks)
    : message;

  // Generate response based on model
  switch (model) {
    case 'gemini':
      return await generateGeminiResponse(prompt, history);
    
    case 'deepseek':
      return await generateDeepseekResponse(prompt, history);
    
    case 'openai':
      return await generateOpenAIResponse(message, history as Array<{ role: 'user' | 'assistant'; content: string }>);
    
    case 'local':
      return await generateLocalResponse(prompt, history);
    
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}

// RAG Usage Logging
export function logRAGUsage(
  chunks: RAGChunk[],
  response: string,
  logRagUsage: (docId: number, chunkIndexes: any[], response: string, timestamp: number) => void
): void {
  if (chunks.length === 0) return;

  const docId = chunks[0].document_id;
  const chunkIndexes = chunks.map(chunk => ({
    chunk_index: chunk.chunk_index,
    chunk_text: chunk.chunk_text
  }));

  logRagUsage(docId, chunkIndexes, response, Date.now());
}

// Format Response
export function formatChatResponse(
  response: string,
  ragChunks: RAGChunk[] = [],
  useRag: boolean = false
): ChatResponse {
  const chatResponse: ChatResponse = { response };

  if (useRag && ragChunks.length > 0) {
    chatResponse.retrievedChunks = ragChunks.map(chunk => ({
      documentId: chunk.document_id,
      chunkIndex: chunk.chunk_index,
      text: chunk.chunk_text,
      similarity: chunk.similarity || 0
    }));
  }

  return chatResponse;
}

// Error Handling
export function handleChatError(error: unknown, res: Response): void {
  console.error('[Chat] Error:', error);
  
  if (error instanceof Error && error.message.includes('required')) {
    res.status(400).json({ error: error.message });
  } else if (error instanceof Error && error.message.includes('Invalid model')) {
    res.status(400).json({ error: error.message });
  } else {
    res.status(500).json({ error: 'Failed to generate response' });
  }
} 