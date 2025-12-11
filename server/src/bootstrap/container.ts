import { loadConfig, AppConfig } from '../infra/config/index.js';
import { DocumentsRepositorySQLite } from '../infra/repositories/sqlite/DocumentsRepositorySQLite.js';
import { DocumentChunksRepositorySQLite } from '../infra/repositories/sqlite/DocumentChunksRepositorySQLite.js';
import { NotesRepositorySQLite } from '../infra/repositories/sqlite/NotesRepositorySQLite.js';
import { QuickNotesRepositorySQLite } from '../infra/repositories/sqlite/QuickNotesRepositorySQLite.js';
import { PermanentNotesRepositorySQLite } from '../infra/repositories/sqlite/PermanentNotesRepositorySQLite.js';
import { ReviewSessionRepositorySQLite } from '../infra/repositories/sqlite/ReviewSessionRepositorySQLite.js';
import { ContextRepositorySQLite } from '../infra/repositories/sqlite/ContextRepositorySQLite.js';
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
import { QuickNotesService } from '../app/quickNotes/QuickNotesService.js';
import { ContextsService } from '../app/contexts/ContextsService.js';
import { NoteTakingAgentService } from '../app/note-taking/NoteTakingAgentService.js';
import { ReviewEngine } from '../app/review/ReviewEngine.js';

export interface Container {
  config: AppConfig;
  repositories: {
    documents: DocumentsRepositorySQLite;
    chunks: DocumentChunksRepositorySQLite;
    notes: NotesRepositorySQLite;
    quickNotes: QuickNotesRepositorySQLite;
    permanentNotes: PermanentNotesRepositorySQLite;
    reviewSessions: ReviewSessionRepositorySQLite;
    contexts: ContextRepositorySQLite;
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
    quickNotes: QuickNotesService;
    contexts: ContextsService;
    noteTakingAgent: NoteTakingAgentService;
    reviewEngine: ReviewEngine;
  };
}

export function buildContainer(): Container {
  const config = loadConfig();
  const repositories = {
    documents: new DocumentsRepositorySQLite(),
    chunks: new DocumentChunksRepositorySQLite(),
    notes: new NotesRepositorySQLite(),
    quickNotes: new QuickNotesRepositorySQLite(),
    permanentNotes: new PermanentNotesRepositorySQLite(),
    reviewSessions: new ReviewSessionRepositorySQLite(),
    contexts: new ContextRepositorySQLite(),
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

  // Create ReviewEngine first
  const reviewEngine = new ReviewEngine(
    repositories.quickNotes,
    repositories.reviewSessions,
    {
      reviewAgeThresholdHours: config.quickNotes.reviewAgeThresholdHours,
      maxQuickNotes: config.quickNotes.maxQuickNotes
    }
  );

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
    notes: new NotesService(repositories.notes),
    quickNotes: new QuickNotesService(repositories.quickNotes, reviewEngine),
    contexts: new ContextsService(repositories.contexts),
    reviewEngine: reviewEngine
  };

  // Create note-taking agent service with full container
  const container: Container = {
    config,
    repositories,
    providers,
    services: {
      ...services,
      noteTakingAgent: new NoteTakingAgentService({
        config,
        repositories,
        providers,
        services
      } as Container)
    }
  };

  return container;
}


