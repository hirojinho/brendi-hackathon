import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { DocumentManager } from './documents.js';
import { startNoteDetection, Note } from './notes.js';
import { NoteDatabase } from './database.js';
import fetch from 'node-fetch';
import multer, { Multer } from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import DocumentDatabase from './documentDatabase.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { generateGeminiResponse, generateNoteWithGemini, geminiModel } from './gemini.js';
import { generateOpenAIResponse } from './openai.js';
import { shouldCreateNote, isSimilarNote } from './notes.js';
import { generateLocalResponse } from './local.js';
import { generateDeepseekResponse, generateNoteWithDeepseek, shouldCreateNoteWithDeepseek } from './deepseek.js';
import {
  validateChatRequest,
  processRAGQuery,
  generateResponse,
  logRAGUsage as logChatRAGUsage,
  formatChatResponse,
  handleChatError
} from './chatService.js';
import {
  validateUploadRequest,
  processDocumentUpload,
  handleUploadError,
  generateUploadId,
  getUploadStatus
} from './uploadService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Explicitly handle OPTIONS for upload endpoint
app.options('/api/documents/upload', cors());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const docManager = new DocumentManager();
const noteDb = new NoteDatabase();
const documentDb = new DocumentDatabase();
let lastCreatedNote: Note | null = null;

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const upload = multer({ dest: uploadDir });

// Initialize note detection system with Gemini
const noteDetection = startNoteDetection(geminiModel, (note: Note) => {
  lastCreatedNote = note;
  noteDb.saveNote(note);
  console.log('Note created:', note.title);
});

// Upload status and helper functions now handled by uploadService.ts

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function chunkText(text: string, chunkSize = 1500): string[] {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let end = i + chunkSize;
    // Try to break at a paragraph or sentence boundary
    let nextBreak = text.lastIndexOf('\n', end);
    if (nextBreak <= i) nextBreak = text.indexOf('\n', end);
    if (nextBreak > i && nextBreak - i < chunkSize * 1.5) end = nextBreak;
    chunks.push(text.slice(i, end).trim());
    i = end - 200; // Add 200 character overlap between chunks
  }
  return chunks.filter(Boolean);
}

// batchArray function moved to uploadService.ts

// --- RAG Usage Logging ---
type RAGChunk = { chunk_index: number; chunk_text: string };
type RAGUsageEntry = {
  documentId: number;
  chunkIndexes: RAGChunk[];
  response: string;
  timestamp: number;
};
const ragUsageLogPath = path.join(process.cwd(), 'rag_usage_log.json');
function logRagUsage(documentId: number, chunkIndexes: RAGChunk[], response: string, timestamp: number) {
  let log: RAGUsageEntry[] = [];
  if (fs.existsSync(ragUsageLogPath)) {
    try {
      log = JSON.parse(fs.readFileSync(ragUsageLogPath, 'utf-8'));
    } catch (err) {
    }
  }
  
  const newEntry = { documentId, chunkIndexes, response, timestamp };
  log.push(newEntry);
  
  try {
    fs.writeFileSync(ragUsageLogPath, JSON.stringify(log, null, 2));
  } catch (err) {
  }
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaChatResponse {
  message?: {
    content: string;
  };
  content?: string;
}

// Helper to get embedding from Ollama
async function getOllamaEmbedding(text: string): Promise<number[]> {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'zylonai/multilingual-e5-large', prompt: text })
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Ollama embedding error:', errorText);
    throw new Error('Ollama embedding failed: ' + errorText);
  }
  const data = await res.json() as OllamaEmbeddingResponse;
  if (!data.embedding) throw new Error('No embedding in Ollama response');
  return data.embedding;
}
// Helper to get embedding from OpenAI
async function getOpenAIEmbedding(text: string): Promise<number[]> {
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000)
  });
  return embeddingRes.data[0].embedding;
}
// Helper to get embedding based on provider
async function getEmbedding(text: string, provider: 'openai' | 'ollama' = 'openai'): Promise<number[]> {
  if (provider === 'ollama') return getOllamaEmbedding(text);
  return getOpenAIEmbedding(text);
}

// Helper: average multiple embeddings
function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) throw new Error('No embeddings to average');
  const length = embeddings[0].length;
  const sum = new Array(length).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < length; i++) {
      sum[i] += emb[i];
    }
  }
  return sum.map(x => x / embeddings.length);
  }

// Chat endpoint: refactored for better maintainability
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    // Validate request
    const chatRequest = validateChatRequest(req.body);
    
    // Process RAG if needed
    let ragChunks: any[] = [];
    if (chatRequest.useRag && (chatRequest.model === 'gemini' || chatRequest.model === 'deepseek' || chatRequest.model === 'local')) {
      ragChunks = await processRAGQuery(
        chatRequest.message,
        chatRequest.maxChunks || 5,
        documentDb,
        getOllamaEmbedding,
        cosineSimilarity
      );
    }

    // Generate response
    const response = await generateResponse(chatRequest, ragChunks);

    // Log RAG usage if applicable
    if (chatRequest.useRag && ragChunks.length > 0) {
      logChatRAGUsage(ragChunks, response, logRagUsage);
    }

    // Format and send response
    const chatResponse = formatChatResponse(response, ragChunks, chatRequest.useRag);
    res.json(chatResponse);

  } catch (error) {
    handleChatError(error, res);
  }
});

// Note endpoint: returns a note for a given assistant response
app.post('/api/note', async (req: Request, res: Response) => {
  try {
    const { content, model = 'gemini' } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Use the same model for both note detection and generation
    const shouldCreate = model === 'deepseek' ? 
      await shouldCreateNoteWithDeepseek({ role: 'assistant', content }) :
      await shouldCreateNote(geminiModel, { role: 'assistant', content });

    let notes: Note[] = [];
    if (shouldCreate) {
      const generatedNotes = model === 'gemini' ?
        await generateNoteWithGemini(
          { role: 'assistant', content },
          'chat-' + Date.now(),
          0
        ) :
        await generateNoteWithDeepseek(
          { role: 'assistant', content },
          'chat-' + Date.now(),
          0
        );
      // Save each unique note
      const allNotes = noteDb.getAllNotes();
      notes = generatedNotes.filter(note => {
        if (!isSimilarNote(note, allNotes)) {
          noteDb.saveNote(note);
          allNotes.push(note); // Avoid near-duplicates in this batch
          console.log('Note saved to database:', note.title);
          return true;
        } else {
          console.log('Skipped duplicate/similar note:', note.title);
          return false;
        }
      });
    }

    res.json({ notes });
  } catch (error) {
    console.error('Error in note endpoint:', error);
    res.status(500).json({ error: 'Failed to generate note' });
  }
});

// chat-local endpoint removed - use /api/chat with model: 'local' instead

app.get('/api/notes', (req: Request, res: Response) => {
  try {
    const notes = noteDb.getAllNotes();
    res.json({ notes });
  } catch (error) {
    console.error('Error retrieving notes:', error);
    res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    noteDb.deleteNote(noteId);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.patch('/api/notes/:id', (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    const {
      nextReview,
      interval,
      easiness,
      repetitions,
      lastReview,
      lastPerformance
    } = req.body;

    // Validate input
    if (interval !== undefined && (typeof interval !== 'number' || interval < 0)) {
      return res.status(400).json({ error: 'Invalid interval value' });
    }
    if (easiness !== undefined && (typeof easiness !== 'number' || easiness < 1.3)) {
      return res.status(400).json({ error: 'Invalid easiness value' });
    }
    if (repetitions !== undefined && (typeof repetitions !== 'number' || repetitions < 0)) {
      return res.status(400).json({ error: 'Invalid repetitions value' });
    }
    if (lastPerformance !== undefined && (typeof lastPerformance !== 'number' || lastPerformance < 0 || lastPerformance > 5)) {
      return res.status(400).json({ error: 'Invalid performance value' });
    }

    const note = noteDb.getNote(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Update SRS fields if provided
    if (nextReview !== undefined) note.nextReview = nextReview ? new Date(nextReview) : undefined;
    if (interval !== undefined) note.interval = interval;
    if (easiness !== undefined) note.easiness = easiness;
    if (repetitions !== undefined) note.repetitions = repetitions;
    if (lastReview !== undefined) note.lastReview = lastReview ? new Date(lastReview) : undefined;
    if (lastPerformance !== undefined) note.lastPerformance = lastPerformance;
    
    note.lastModified = new Date();
    noteDb.saveNote(note);

    console.log('Updated note SRS fields:', {
      id: noteId,
      nextReview: note.nextReview,
      interval: note.interval,
      easiness: note.easiness,
      repetitions: note.repetitions,
      lastReview: note.lastReview,
      lastPerformance: note.lastPerformance
    });

    res.json({ note });
  } catch (error) {
    console.error('Error updating note SRS fields:', error);
    res.status(500).json({ error: 'Failed to update note SRS fields' });
  }
});

// Upload PDF endpoint: refactored for better maintainability
app.post('/api/documents/upload', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  const uploadId = generateUploadId();
  
  try {
    // Validate request
    const uploadRequest = validateUploadRequest(req);
    
    // Process document upload
    const result = await processDocumentUpload(uploadRequest, uploadId, {
      documentDb,
      openai,
      getOllamaEmbedding,
      getEmbedding
    });

    res.json(result);
  } catch (error) {
    handleUploadError(error, uploadId, res);
  }
});

// Endpoint for polling upload status
app.get('/api/documents/upload-status/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  res.json(getUploadStatus(uploadId));
});

// List all documents
app.get('/api/documents', (req, res) => {
  try {
    const docs = documentDb.getAllDocuments();
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Delete document
app.delete('/api/documents/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    documentDb.deleteDocument(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// --- New endpoint: Get all responses where a document's chunks were used ---
app.get('/api/documents/:id/usage', (req, res) => {
  const docId = Number(req.params.id);
  
  if (!fs.existsSync(ragUsageLogPath)) {
    return res.json([]);
  }
  
  try {
    const log: RAGUsageEntry[] = JSON.parse(fs.readFileSync(ragUsageLogPath, 'utf-8'));
    
    const filtered = log.filter((entry: RAGUsageEntry) => entry.documentId === docId);
    
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read usage log' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 