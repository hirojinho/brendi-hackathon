import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  port: number;
  dbPath: string;
  uploadsDir: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  defaultMode?: 'chat' | 'note-taking';
  rag: {
    similarityThreshold: number;
    fallbackChunks: number;
    maxEmbeddingChars: number;
    defaultMaxChunks: number;
  };
  chunking: {
    chunkSize: number;
  };
}

export function loadConfig(cwd: string = process.cwd()): AppConfig {
  const uploadsDir = path.join(cwd, 'uploads');
  const dbPath = path.join(cwd, 'documents.db');

  return {
    port: Number(process.env.PORT || 3001),
    dbPath,
    uploadsDir,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    defaultMode: (process.env.DEFAULT_MODE as 'chat' | 'note-taking' | undefined) || 'chat',
    rag: {
      similarityThreshold: Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.35),
      fallbackChunks: Number(process.env.RAG_FALLBACK_CHUNKS || 5),
      maxEmbeddingChars: Number(process.env.RAG_MAX_EMBEDDING_CHARS || 10000),
      defaultMaxChunks: Number(process.env.RAG_DEFAULT_MAX_CHUNKS || 5)
    },
    chunking: {
      chunkSize: Number(process.env.CHUNK_SIZE || 1500)
    }
  };
}


