import { loadConfig, AppConfig } from '../infra/config/index.js';
import { DocumentsRepositorySQLite } from '../infra/repositories/sqlite/DocumentsRepositorySQLite.js';
import { DocumentChunksRepositorySQLite } from '../infra/repositories/sqlite/DocumentChunksRepositorySQLite.js';
import { NotesRepositorySQLite } from '../infra/repositories/sqlite/NotesRepositorySQLite.js';
import { UsageRepositoryFile } from '../infra/repositories/file/UsageRepositoryFile.js';
import { OpenAIProvider } from '../infra/providers/llm/openai.js';
import { OpenRouterProvider } from '../infra/providers/llm/openrouter.js';
import { OllamaProvider } from '../infra/providers/llm/ollama.js';
import { OpenAIEmbeddingProvider } from '../infra/providers/embeddings/openai.js';
import { OllamaEmbeddingProvider } from '../infra/providers/embeddings/ollama.js';
import { PdfJsParser } from '../infra/providers/pdf/pdfjs.js';
import { FilesystemStorage } from '../infra/providers/storage/filesystem.js';
import { ChatService } from '../app/chat/ChatService.js';
import { RAGService } from '../app/documents/RAGService.js';
import { DocumentIngestionService } from '../app/documents/DocumentIngestionService.js';
import { NotesService } from '../app/notes/NotesService.js';

export interface Container {
  config: AppConfig;
  repositories: {
    documents: DocumentsRepositorySQLite;
    chunks: DocumentChunksRepositorySQLite;
    notes: NotesRepositorySQLite;
    usage: UsageRepositoryFile;
  };
  providers: {
    llm: {
      openai: OpenAIProvider;
      openrouter: OpenRouterProvider;
      ollama: OllamaProvider;
    };
    embeddings: {
      openai: OpenAIEmbeddingProvider;
      ollama: OllamaEmbeddingProvider;
    };
    pdf: PdfJsParser;
    storage: FilesystemStorage;
  };
  services: {
    chat: ChatService;
    rag: RAGService;
    ingestion: DocumentIngestionService;
    notes: NotesService;
  };
}

export function buildContainer(): Container {
  const config = loadConfig();
  const repositories = {
    documents: new DocumentsRepositorySQLite(),
    chunks: new DocumentChunksRepositorySQLite(),
    notes: new NotesRepositorySQLite(),
    usage: new UsageRepositoryFile()
  };

  const providers = {
    llm: {
      openai: new OpenAIProvider(config.openaiApiKey),
      openrouter: new OpenRouterProvider(config.openrouterApiKey || ''),
      ollama: new OllamaProvider(config.ollamaBaseUrl)
    },
    embeddings: {
      openai: new OpenAIEmbeddingProvider(config.openaiApiKey),
      ollama: new OllamaEmbeddingProvider(config.ollamaBaseUrl)
    },
    pdf: new PdfJsParser(),
    storage: new FilesystemStorage(config.uploadsDir)
  };

  const services = {
    chat: new ChatService({
      openrouter: providers.llm.openrouter,
      openai: providers.llm.openai,
      ollama: providers.llm.ollama
    }),
    rag: new RAGService(
      providers.embeddings.ollama, // default to ollama for similarity as today
      repositories.chunks,
      repositories.usage,
      config.rag.similarityThreshold,
      config.rag.fallbackChunks
    ),
    ingestion: new DocumentIngestionService(
      providers.pdf,
      providers.embeddings.openai, // default to openai for embeddings
      repositories.documents,
      repositories.chunks,
      config.rag.maxEmbeddingChars
    ),
    notes: new NotesService(repositories.notes)
  };

  return {
    config,
    repositories,
    providers,
    services
  };
}


