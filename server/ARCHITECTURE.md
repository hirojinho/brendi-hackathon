## Backend Architecture and ADR

This document explains the current backend architecture, the design choices, patterns, trade‑offs, and outlines future evolution (including desktop migration). It also serves as an ADR (Architecture Decision Record) for the present implementation.

### Goals

- Keep data local and private (SQLite files, local uploads)
- Simple, maintainable architecture with clear separation of concerns
- Pluggable AI providers (OpenAI, OpenRouter, Ollama)
- Robust RAG pipeline for local documents
- Minimal runtime dependencies; easy to evolve into a desktop app (no mandatory HTTP server)

### Non‑Goals (for now)

- Strong input validation, authN/authZ
- Mature observability/metrics and production SRE setup
- CI/CD and test automation

## High‑Level Architecture

Layered, lean Clean Architecture:

- HTTP (presentation): Express controllers and routes mapping JSON requests/responses to application services.
- Application (use‑cases): Stateless services orchestrating workflows (Chat, DocumentIngestion, RAG, Notes).
- Domain: Entities, provider/repository interfaces, and centralized prompts.
- Infrastructure: Concrete adapters (SQLite repositories, LLM/Embeddings/PDF/Storage providers, config, file logging).

This separation makes code easy to read, test in isolation, and replace parts (e.g., switch LLM provider) without cross‑cutting edits.

## Directory Layout

```
server/src/
├── index.ts                      # Entry point: bootstraps DI and registers routes
├── bootstrap/
│   └── container.ts             # DI container wiring providers, repositories, and services
├── http/
│   ├── registerRoutes.ts        # Attaches all routes to Express
│   ├── routes/
│   │   ├── chat.routes.ts
│   │   ├── documents.routes.ts
│   │   └── notes.routes.ts
│   └── controllers/
│       ├── chat.controller.ts
│       ├── documents.controller.ts
│       └── notes.controller.ts
├── app/
│   ├── chat/ChatService.ts
│   ├── documents/DocumentIngestionService.ts
│   ├── documents/RAGService.ts
│   └── notes/NotesService.ts
├── domain/
│   ├── entities/
│   │   └── index.ts
│   ├── ports/
│   │   ├── providers/index.ts   # LLM, embeddings, PDF, storage contracts
│   │   └── repositories/index.ts
│   └── prompts/
│       ├── system.ts            # Single source of truth: chat system prompt
│       └── note.ts              # Note‑generation prompt
├── infra/
│   ├── config/index.ts          # Env + typed config with sensible defaults
│   ├── db/
│   │   ├── documentDatabase.ts  # better‑sqlite3 doc store
│   │   └── noteDatabase.ts      # better‑sqlite3 notes store
│   ├── providers/
│   │   ├── embeddings/{openai,ollama}.ts
│   │   ├── llm/{openai,openrouter,ollama}.ts
│   │   ├── pdf/pdfjs.ts
│   │   └── storage/filesystem.ts
│   └── repositories/
│       ├── file/UsageRepositoryFile.ts
│       └── sqlite/{DocumentsRepositorySQLite,DocumentChunksRepositorySQLite,NotesRepositorySQLite}.ts
└── shared/
    └── uploadStatus.ts          # In‑memory progress map for uploads
```

## Key Components and Patterns

### Dependency Injection (DI)

- `bootstrap/container.ts` builds a single container:
  - repositories (SQLite + file), providers (LLM, embeddings, PDF, storage), application services (chat, RAG, ingestion, notes), and config.
- Benefits: loose coupling, easy swapping/mocking, single composition root.

### Providers (Strategy/Adapter)

- LLM providers (`infra/providers/llm`): OpenAI, OpenRouter, Ollama.
  - All read the unified system prompt from `domain/prompts/system.ts`.
  - Strategy by model selection (ChatService chooses provider by `model`).
- Embedding providers (`infra/providers/embeddings`): OpenAI, Ollama.
- PDF parsing via pdf.js adapter; file storage via a small filesystem provider.

Trade‑off: Keeping providers slim minimizes code duplication and makes model routing explicit; minor provider differences are handled in adapters.

### Repositories (Repository pattern)

- SQLite via better‑sqlite3 for documents, document chunks, and notes.
- File‑based usage log adapter (RAG usage) for simplicity; can be moved into SQLite later.

Trade‑off: better‑sqlite3 is fast and simple but requires native builds (electron/electron‑builder handles this). For complex schemas and migrations, an ORM (e.g., Drizzle) can be added later.

### Application Services

- ChatService: dispatches to provider by `model`, injects system prompt via providers. Optionally combines with RAG prompt from RAGService.
- DocumentIngestionService: extract → chunk → embed → store → compute document‑level embedding (truncation guard). Pure orchestrator.
- RAGService: query embedding → cosine similarity scoring → threshold + fallback top‑K → usage logging.
- NotesService: simple CRUD + SRS fields update.

Pattern: Each service is stateless and uses dependency‑injected collaborators.

### HTTP Layer (thin)

- Express routes/controllers delegate to services and return JSON.
- Minimal validation and centralized error handling are intentionally light for now (personal project scope).

### Config

- `infra/config/index.ts`: typed config with defaults; surfaces important knobs: port, db path, uploads dir, API keys, RAG thresholds, chunk sizes.

### Prompts (Single Source of Truth)

- `domain/prompts/system.ts`: chat‑wide system prompt that enforces Markdown/LaTeX and source citations.
- `domain/prompts/note.ts`: note‑generation prompt structure.

Benefit: Changing assistant behavior is a single‑file edit; all providers reflect the change.

### Upload Status

- `shared/uploadStatus.ts`: in‑memory progress map keyed by uploadId; simple and sufficient for local desktop usage and short‑lived uploads.

Trade‑off: Not durable across restarts. If durability is needed, a DB table can replace it without touching controllers.

## Data Model (SQLite, simplified)

- `documents(id, title, originalname, text, embedding_json, created_at)`
- `document_chunks(id, document_id, chunk_index, chunk_text, embedding_json)`
- `notes(id, title, content, tags_json, related_notes_json, srs fields..., conversation_id, message_index, created_at, updated_at)`
- `rag_usage` (file‑based JSON for now)

Trade‑off: Keeping RAG usage in a JSON file is pragmatic and easy to inspect; can be folded into SQLite later.

## Design Choices and Trade‑offs

- SQLite + better‑sqlite3: fast local persistence, trivial deploy, great fit for a desktop app; native builds are the main caveat.
- Minimal validation/logging: acceptable for personal use; trivial to harden later by adding middleware and schemas.
- Ports/Adapters: clean boundaries allow swapping LLMs or embedding engines with minimal edits.
- Centralized prompts: single source of truth for assistant behavior reduces drift across providers.
- Thin HTTP: we keep controllers light and move logic into services for reusability (important for desktop migration).

## Performance Notes

- Embeddings are truncated to reasonable lengths; document‑level embeddings use truncated text to avoid excessive tokens.
- Cosine similarity is O(N) across chunks; consider pre‑filtering, ANN indexes, or limiting K for very large corpora.

## Security & Privacy

- Data is local by default (SQLite files + uploads directory). API keys are read from env at runtime.
- Production desktop app should keep keys in main process (Electron) and optionally store them in macOS Keychain (keytar).

## Desktop Migration Plan (Summary)

- Remove Express; run the same services/repositories/providers in Electron main process.
- Expose a typed IPC surface from main (preload) to renderer instead of HTTP.
- Keep SQLite files under `app.getPath('userData')`; copy existing DBs on first run if needed.
- Use the same DI container to wire modules; move config path resolution to main.

## Future Enhancements

- Strong input validation (Zod) and error taxonomy
- Migrations and schema management (Drizzle ORM)
- Metrics/logging (pino + Prometheus), rate limiting
- Streaming responses for chat via SSE/IPC streaming
- Consolidate `rag_usage` into SQLite
- Unit/integration tests and CI when the project grows

## ADR: Decision Summary

1) Use a lean Clean Architecture with DI and repository/provider patterns to maximize maintainability and swap‑ability.
2) Keep data local in SQLite and store uploads in a local directory.
3) Centralize prompts to a single source of truth for consistent provider behavior.
4) Keep HTTP thin and optional to enable a seamless move to an Electron desktop app.
5) Defer heavy validation, observability, and CI to keep iteration fast; the design deliberately leaves clear seams to add them later.


