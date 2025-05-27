import { Request, Response } from 'express';
import { generateOpenRouterResponse } from './openrouter.js';
import { generateOpenAIResponse } from './openai.js';
import { generateOllamaResponse } from './ollama.js';
import DocumentDatabase from './documentDatabase.js';

// Configuration constants
export const RAG_CONFIG = {
  SIMILARITY_THRESHOLD: 0.7,
  DEFAULT_MAX_CHUNKS: 5,
  FALLBACK_CHUNKS: 3,
} as const;

export const DUPLICATE_DETECTION_CONFIG = {
  TITLE_SIMILARITY_THRESHOLD: 0.85,
  CONTENT_SIMILARITY_THRESHOLD: 0.80,
  TAG_OVERLAP_THRESHOLD: 0.6,
  MIN_CONTENT_LENGTH: 20,
} as const;

// Types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatRequest {
  message: string;
  history?: Array<{ role: MessageRole; content: string }>;
  model?: 'openrouter' | 'openai' | 'ollama';
  modelName?: string; // Dynamic model name for openrouter and ollama
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
  const { message, history, model = 'openai', modelName, useRag = false, maxChunks = RAG_CONFIG.DEFAULT_MAX_CHUNKS } = body;
  
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }
  
  if (model && !['openrouter', 'openai', 'ollama'].includes(model)) {
    throw new Error('Invalid model specified');
  }

  return {
    message,
    history: history || [],
    model,
    modelName,
    useRag,
    maxChunks
  };
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
  const { message, history = [], model, modelName, useRag } = request;
  
  // Prepare prompt
  const prompt = useRag && ragChunks.length > 0 
    ? createRAGPrompt(message, ragChunks)
    : message;

  // Generate response based on model
  switch (model) {
    case 'openrouter':
      return await generateOpenRouterResponse(prompt, history, modelName);
    
    case 'openai':
      return await generateOpenAIResponse(message, history as Array<{ role: 'user' | 'assistant'; content: string }>);
    
    case 'ollama':
      return await generateOllamaResponse(prompt, history, modelName);
    
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

// Duplicate Detection Functions
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarNote?: any;
  similarityScore?: number;
  reason?: string;
}

export function calculateStringSimilarity(str1: string, str2: string): number {
  // Normalize strings
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Handle exact matches
  if (s1 === s2) return 1.0;
  
  // Handle empty strings
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Use Jaccard similarity for word-level comparison
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function calculateTagOverlap(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 1.0;
  if (tags1.length === 0 || tags2.length === 0) return 0.0;
  
  const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
  const set2 = new Set(tags2.map(tag => tag.toLowerCase()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

export function calculateContentSimilarity(content1: string, content2: string): number {
  // Remove markdown formatting and LaTeX for comparison
  const cleanContent = (content: string) => {
    return content
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove code
      .replace(/\$[^$]+\$/g, '[MATH]') // Replace LaTeX with placeholder
      .replace(/#+\s*/g, '') // Remove headers
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };
  
  const clean1 = cleanContent(content1);
  const clean2 = cleanContent(content2);
  
  return calculateStringSimilarity(clean1, clean2);
}

export function checkForDuplicateNote(newNote: any, existingNotes: any[]): DuplicateCheckResult {
  if (!existingNotes || existingNotes.length === 0) {
    return { isDuplicate: false };
  }
  
  // Skip very short content
  if (newNote.content.length < DUPLICATE_DETECTION_CONFIG.MIN_CONTENT_LENGTH) {
    return { isDuplicate: false };
  }
  
  let maxSimilarity = 0;
  let mostSimilarNote = null;
  let reason = '';
  
  for (const existingNote of existingNotes) {
    // Check for exact title matches
    const titleSimilarity = calculateStringSimilarity(newNote.title, existingNote.title);
    if (titleSimilarity >= DUPLICATE_DETECTION_CONFIG.TITLE_SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        similarNote: existingNote,
        similarityScore: titleSimilarity,
        reason: `Very similar title (${(titleSimilarity * 100).toFixed(1)}% match)`
      };
    }
    
    // Check content similarity
    const contentSimilarity = calculateContentSimilarity(newNote.content, existingNote.content);
    if (contentSimilarity >= DUPLICATE_DETECTION_CONFIG.CONTENT_SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        similarNote: existingNote,
        similarityScore: contentSimilarity,
        reason: `Very similar content (${(contentSimilarity * 100).toFixed(1)}% match)`
      };
    }
    
    // Check combined similarity (title + content + tags)
    const tagOverlap = calculateTagOverlap(newNote.tags, existingNote.tags);
    const combinedSimilarity = (titleSimilarity * 0.4) + (contentSimilarity * 0.5) + (tagOverlap * 0.1);
    
    if (combinedSimilarity > maxSimilarity) {
      maxSimilarity = combinedSimilarity;
      mostSimilarNote = existingNote;
    }
    
    // Check if tags overlap significantly AND content is somewhat similar
    if (tagOverlap >= DUPLICATE_DETECTION_CONFIG.TAG_OVERLAP_THRESHOLD && 
        contentSimilarity >= 0.6) {
      return {
        isDuplicate: true,
        similarNote: existingNote,
        similarityScore: combinedSimilarity,
        reason: `Similar topic and content (${(tagOverlap * 100).toFixed(1)}% tag overlap, ${(contentSimilarity * 100).toFixed(1)}% content similarity)`
      };
    }
  }
  
  // If we found a very similar note but it didn't trigger duplicate detection
  if (maxSimilarity >= 0.7) {
    console.log(`[Duplicate Detection] High similarity found (${(maxSimilarity * 100).toFixed(1)}%) but below threshold for: "${newNote.title}"`);
  }
  
  return { isDuplicate: false };
}

export function filterDuplicateNotes(newNotes: any[], existingNotes: any[]): { 
  acceptedNotes: any[], 
  rejectedNotes: Array<{ note: any, reason: string }> 
} {
  const acceptedNotes: any[] = [];
  const rejectedNotes: Array<{ note: any, reason: string }> = [];
  
  for (const newNote of newNotes) {
    const duplicateCheck = checkForDuplicateNote(newNote, existingNotes);
    
    if (duplicateCheck.isDuplicate) {
      console.log(`[Duplicate Detection] Rejected note: "${newNote.title}" - ${duplicateCheck.reason}`);
      rejectedNotes.push({ 
        note: newNote, 
        reason: duplicateCheck.reason || 'Duplicate detected' 
      });
    } else {
      acceptedNotes.push(newNote);
      // Add to existing notes for subsequent duplicate checks within the same batch
      existingNotes.push(newNote);
    }
  }
  
  return { acceptedNotes, rejectedNotes };
}

// Note Generation Functions
export async function shouldCreateNote(content: string, model: string, modelName?: string): Promise<boolean> {
  try {
    // Skip if content is too short
    if (content.length < 50) {
      console.log('[Note Detection] Skipping - content too short');
      return false;
    }

    // Skip if content is purely exploratory questions
    const purelyExploratoryPhrases = [
      'what would you like to explore',
      'what aspects interest you',
      'what would you like to focus on',
      'what would you like to learn more about',
      'what would you like to discuss',
      'what would you like to know',
      'what would you like to understand',
      'what would you like to investigate',
      'what would you like to examine',
      'what would you like to look into'
    ];

    const isPurelyExploratory = purelyExploratoryPhrases.some(phrase => 
      content.toLowerCase().includes(phrase) && content.split('.').length <= 2
    );

    if (isPurelyExploratory) {
      console.log('[Note Detection] Skipping - purely exploratory questions');
      return false;
    }

    // Check for fundamental concept indicators (relaxed check)
    const fundamentalIndicators = [
      'fundamental', 'principle', 'concept', 'theory', 'law', 'method', 'approach', 'framework',
      'paradigm', 'model', 'system', 'mechanism', 'process', 'strategy', 'technique',
      'definition', 'meaning', 'explanation', 'understanding', 'idea', 'solution', 'algorithm',
      'formula', 'equation', 'rule', 'property', 'characteristic', 'behavior', 'pattern',
      'relationship', 'structure', 'function', 'purpose', 'reason', 'cause', 'effect'
    ];
    
    const hasFundamentalContent = fundamentalIndicators.some(indicator =>
      content.toLowerCase().includes(indicator)
    );
    
    const hasMathContent = /\$[^$]+\$|\\\w+|\d+\s*[=<>]\s*\d+/.test(content);
    const hasEducationalKeywords = /learn|understand|explain|solve|calculate|derive|prove|show|demonstrate|analyze|examine|study|explore|investigate/i.test(content);
    
    // Pass if any of these conditions are met
    if (!hasFundamentalContent && !hasMathContent && !hasEducationalKeywords) {
      console.log('[Note Detection] Skipping - no fundamental concepts, math, or educational content detected');
      return false;
    }

    console.log('[Note Detection] Content qualifies for note generation');
    return true;
  } catch (error) {
    console.error('[Note Detection] Error:', error);
    return false;
  }
}

export async function generateNoteWithOpenRouter(content: string, modelName?: string, existingNotes: any[] = []): Promise<any[]> {
  const prompt = createNoteGenerationPrompt(content);
  
  try {
    const response = await generateOpenRouterResponse(prompt, [], modelName);
    const newNotes = parseNoteResponse(response, existingNotes);
    
    // Filter out duplicates
    const { acceptedNotes, rejectedNotes } = filterDuplicateNotes(newNotes, existingNotes);
    
    if (rejectedNotes.length > 0) {
      console.log(`[OpenRouter] Note generation: ${acceptedNotes.length} accepted, ${rejectedNotes.length} rejected as duplicates`);
    }
    
    return acceptedNotes;
  } catch (error) {
    console.error('[OpenRouter] Error generating note:', error);
    return [];
  }
}

export async function generateNoteWithOpenAI(content: string, existingNotes: any[] = []): Promise<any[]> {
  const prompt = createNoteGenerationPrompt(content);
  
  try {
    const response = await generateOpenAIResponse(prompt, []);
    const newNotes = parseNoteResponse(response, existingNotes);
    
    // Filter out duplicates
    const { acceptedNotes, rejectedNotes } = filterDuplicateNotes(newNotes, existingNotes);
    
    if (rejectedNotes.length > 0) {
      console.log(`[OpenAI] Note generation: ${acceptedNotes.length} accepted, ${rejectedNotes.length} rejected as duplicates`);
    }
    
    return acceptedNotes;
  } catch (error) {
    console.error('[OpenAI] Error generating note:', error);
    return [];
  }
}

export async function generateNoteWithOllama(content: string, modelName?: string, existingNotes: any[] = []): Promise<any[]> {
  const prompt = createNoteGenerationPrompt(content);
  
  try {
    const response = await generateOllamaResponse(prompt, [], modelName);
    const newNotes = parseNoteResponse(response, existingNotes);
    
    // Filter out duplicates
    const { acceptedNotes, rejectedNotes } = filterDuplicateNotes(newNotes, existingNotes);
    
    if (rejectedNotes.length > 0) {
      console.log(`[Ollama] Note generation: ${acceptedNotes.length} accepted, ${rejectedNotes.length} rejected as duplicates`);
    }
    
    return acceptedNotes;
  } catch (error) {
    console.error('[Ollama] Error generating note:', error);
    return [];
  }
}

function createNoteGenerationPrompt(content: string): string {
  return `You are a Zettelkasten note-taking assistant focused on extracting fundamental concepts that directly address core understanding.

Your goal is to identify what specific knowledge gap or concept the content addresses, and write a SINGLE, brief, self-contained explanation of the fundamental concept.

Guidelines for note creation:
1. Focus on the RELATIONSHIP, RULE, or PRINCIPLE that directly answers the question or explains the concept
2. Write a concise explanation (2-3 sentences) of that specific concept
3. The note should be valuable for future reference and help understand related concepts
4. Use Markdown for formatting and LaTeX for math ($...$ for inline, $$...$$ for block)
5. Tags should reflect the specific concept, not just general topics

Create ONLY ONE note if there is a clear fundamental concept. Create NO notes if the content is just conversation or lacks educational value.

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{
  "thinking": "What fundamental concept does this content explain?",
  "notes": [
    {
      "title": "string",
      "content": "string", 
      "tags": ["string", "string", "string"]
    }
  ]
}

If no fundamental concept is present, respond with:
{
  "thinking": "No fundamental concept identified",
  "notes": []
}

Content to analyze:
${content}`;
}

function parseNoteResponse(response: string, existingNotes: any[]): any[] {
  try {
    console.log('[Note Generation] Raw response:', response.substring(0, 200) + '...');
    
    // Clean the response more thoroughly
    let cleanedContent = response
      .replace(/```json|```/g, '')
      .trim();
    
    // Fix common JSON issues
    cleanedContent = cleanedContent
      .replace(/\\"/g, '"')  // Fix escaped quotes
      .replace(/\\n/g, ' ')  // Replace literal \n with spaces
      .replace(/\\t/g, ' ')  // Replace literal \t with spaces
      .replace(/\\\\/g, '\\') // Fix double escapes
      .replace(/"\s*\n\s*"/g, '" "') // Fix newlines between quotes
      .replace(/,\s*}/g, '}') // Remove trailing commas
      .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
    
    // Try to extract JSON if extra text is present
    let jsonString = cleanedContent;
    if (!jsonString.startsWith('{')) {
      // Look for JSON object in the response
      const jsonMatch = jsonString.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      } else {
        console.log('[Note Generation] No valid JSON structure found');
        return [];
      }
    }
    
    // Try to find the end of the JSON object properly
    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = 0; i < jsonString.length; i++) {
      if (jsonString[i] === '{') braceCount++;
      if (jsonString[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonEnd > 0) {
      jsonString = jsonString.substring(0, jsonEnd);
    }
    
    console.log('[Note Generation] Cleaned JSON:', jsonString.substring(0, 200) + '...');

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (firstError) {
      console.log('[Note Generation] First parse attempt failed, trying fallback approach');
      
      // Fallback: try to extract notes array manually using regex
      const titleMatch = jsonString.match(/"title":\s*"([^"]+)"/);
      const contentMatch = jsonString.match(/"content":\s*"([^"]+)"/);
      const tagsMatch = jsonString.match(/"tags":\s*\[([^\]]+)\]/);
      
      if (titleMatch && contentMatch) {
        console.log('[Note Generation] Using regex fallback extraction');
        let tags = ['extracted'];
        if (tagsMatch) {
          try {
            tags = tagsMatch[1].split(',').map(tag => tag.trim().replace(/"/g, ''));
          } catch (e) {
            console.log('[Note Generation] Could not parse tags, using default');
          }
        }
        
        parsed = {
          notes: [{
            title: titleMatch[1],
            content: contentMatch[1],
            tags: tags
          }]
        };
      } else {
        console.error('[Note Generation] Could not extract note data from response');
        return [];
      }
    }
    
    const notes = parsed.notes || [];
    
    if (!Array.isArray(notes) || notes.length === 0) {
      console.log('[Note Generation] No notes generated');
      return [];
    }

    // Validate and format notes
    const validNotes = notes.filter((note: any) => {
      return note && note.title && note.content && Array.isArray(note.tags);
    }).map((note: any, idx: number) => ({
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${idx}`,
      title: note.title,
      content: note.content,
      tags: note.tags,
      relatedNotes: [],
      createdAt: new Date(),
      lastModified: new Date(),
      source: {
        conversationId: 'chat',
        messageIndex: 0
      },
      nextReview: undefined,
      interval: undefined,
      easiness: undefined,
      repetitions: undefined,
      lastReview: undefined,
      lastPerformance: undefined
    }));

    console.log(`[Note Generation] Generated ${validNotes.length} valid notes`);
    return validNotes;
  } catch (error) {
    console.error('[Note Generation] Error parsing response:', error);
    console.error('[Note Generation] Raw response was:', response);
    return [];
  }
} 