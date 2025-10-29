# Study Assistant

A powerful AI-powered study assistant that helps you learn, take notes, and review content effectively. The application combines modern AI capabilities with proven learning techniques like spaced repetition and the Zettelkasten method.

## Features

- 🤖 **AI-Powered Chat**: Interact with multiple AI models including OpenAI GPT-4.1-mini, Google Gemini 2.0 Flash, Llama 3.3 8B (via OpenRouter), and local models via Ollama
- 📝 **Smart Note-Taking**: Automatic note creation when important concepts are detected in conversations
- 🧠 **Spaced Repetition System (SRS)**: Review your notes at optimal intervals for better retention
- 🔄 **Zettelkasten Method**: Visualize connections between your notes in an interactive knowledge graph
- 📚 **Document Management**: Upload and process study materials (PDFs supported)
- 🎯 **Review System**: Test your knowledge with AI-generated questions based on your notes
- 📱 **Modern UI**: Clean, responsive interface built with React and TypeScript

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Custom components with React Icons
- **Visualization**: Force-graph for knowledge graphs
- **Markdown**: React-markdown with KaTeX support for math rendering
- **PDF Processing**: PDF.js for client-side PDF handling

### Backend
- **Runtime**: Node.js with Express
- **Architecture**: Lean Clean Architecture (HTTP → Application → Domain → Infrastructure)
- **Database**: SQLite with better-sqlite3
- **AI Providers**: OpenAI, OpenRouter, Ollama (via provider strategy)
- **RAG**: Embedding providers + cosine similarity, usage logging
- **Documents**: PDF.js parsing, ingestion pipeline (extract → chunk → embed → store)
- **File Upload**: Multer

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- At least one AI API key:
  - OpenAI API key (for GPT-4.1-mini)
  - Google Gemini API key (for Gemini 2.0 Flash)
  - OpenRouter API key (for Llama 3.3 8B and other models)
  - Or Ollama installed locally (for local models)

## Installation

1. **Clone the repository:**
```bash
git clone git@github.com:hirojinho/brendi-hackathon.git
cd brendi-hackathon
```

2. **Install root dependencies:**
```bash
npm install
```

3. **Install server dependencies:**
```bash
cd server
npm install
cd ..
```

4. **Install web dependencies:**
```bash
cd web
npm install
cd ..
```

5. **Create environment file:**
Create a `.env` file in the `server` directory with your API keys:
```env
# OpenAI (for GPT-4.1-mini)
OPENAI_API_KEY=your_openai_api_key

# OpenRouter (for Llama 3.3 8B and other models)
OPENROUTER_API_KEY=your_openrouter_api_key

# Server configuration
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
```

6. **Start the application:**

For development, you'll need to run both the server and web client:

**Terminal 1 - Start the server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start the web client:**
```bash
cd web
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Backend Architecture and Layout

```
server/src/
├── index.ts                     # Only root file; bootstraps container and registers routes
├── bootstrap/
│   └── container.ts            # DI wiring: repositories, providers, services
├── http/
│   ├── registerRoutes.ts       # Mounts all routers
│   ├── routes/
│   │   ├── chat.routes.ts
│   │   ├── documents.routes.ts
│   │   └── notes.routes.ts
│   └── controllers/
│       ├── chat.controller.ts
│       ├── documents.controller.ts
│       └── notes.controller.ts
├── app/                        # Application layer (use-cases/services)
│   ├── chat/ChatService.ts
│   ├── documents/DocumentIngestionService.ts
│   ├── documents/RAGService.ts
│   └── notes/NotesService.ts
├── domain/                     # Domain contracts and prompts
│   ├── entities/
│   │   └── index.ts
│   ├── ports/
│   │   ├── providers/index.ts
│   │   └── repositories/index.ts
│   └── prompts/
│       ├── system.ts           # Chat system prompt (single source of truth)
│       └── note.ts             # Note-generation prompt
├── infra/                      # Infrastructure adapters
│   ├── config/index.ts         # Env and defaults, typed config
│   ├── db/
│   │   ├── documentDatabase.ts
│   │   └── noteDatabase.ts
│   ├── providers/
│   │   ├── embeddings/{openai,ollama}.ts
│   │   ├── llm/{openai,openrouter,ollama}.ts
│   │   ├── pdf/pdfjs.ts
│   │   └── storage/filesystem.ts
│   └── repositories/
│       ├── file/UsageRepositoryFile.ts
│       └── sqlite/{DocumentsRepositorySQLite,DocumentChunksRepositorySQLite,NotesRepositorySQLite}.ts
└── shared/
    └── uploadStatus.ts
```

Design principles:
- Clear separation of concerns; swappable providers via interfaces
- Minimal validation/logging for now; production hardening can be added later
- Single source of truth for prompts in `domain/prompts/*`

## Features in Detail

### AI Chat
- **Multiple AI Providers**: Support for OpenAI GPT-4.1-mini, Google Gemini 2.0 Flash, Llama 3.3 8B (via OpenRouter), and local Ollama models
- **Automatic Note Creation**: AI automatically detects important concepts and creates notes
- **Markdown Support**: Rich text formatting with math equation support via KaTeX
- **Context Awareness**: AI maintains conversation context for better assistance

### Note System
- **Smart Detection**: Automatic identification of key concepts from chat conversations
- **Tag-based Organization**: Organize notes with tags for easy categorization
- **Duplicate Prevention**: Intelligent duplicate detection to avoid redundant notes
- **Rich Content**: Support for markdown formatting and mathematical expressions

### Spaced Repetition
- **SuperMemo 2 Algorithm**: Implements proven spaced repetition techniques
- **Adaptive Intervals**: Review scheduling adapts based on your performance
- **Progress Tracking**: Monitor your learning progress over time

### Zettelkasten View
- **Interactive Graph**: Visual representation of note connections
- **Force-directed Layout**: Automatic positioning based on relationships
- **Color Coding**: Visual distinction based on tags and content similarity
- **Navigation**: Click-to-navigate between connected concepts

### Document Management
- **PDF Upload**: Support for PDF document upload and processing
- **Text Extraction**: Automatic text extraction from uploaded documents
- **Integration**: Seamless integration with the note and chat systems
- **Storage**: Secure file storage with database indexing

## Development

### Available Scripts

**Root level:**
- `npm start` - Start the server with ts-node

**Server (`/server`):**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

**Web (`/web`):**
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database

The application uses SQLite databases:
- `study_notes.db` - Stores notes, tags, and spaced repetition data
- `documents.db` - Stores uploaded documents and their metadata

### API Endpoints (core)

- `POST /api/chat` — Chat with optional RAG; supports models: `openai`, `openrouter`, `ollama`
- `POST /api/note` — Generate notes from content via selected model
- `GET /api/notes`, `DELETE /api/notes/:id`, `PATCH /api/notes/:id` — Notes management + SRS update
- `POST /api/documents/upload` — Upload and index a PDF (embedding provider: `openai` or `ollama`)
- `GET /api/documents/upload-status/:uploadId` — Poll upload progress
- `GET /api/documents`, `DELETE /api/documents/:id` — Document management
- `GET /api/documents/:id/usage` — RAG usage log for a document

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the Brendi Hackathon
- Implements learning techniques backed by cognitive science research
- Uses modern web technologies for optimal user experience 