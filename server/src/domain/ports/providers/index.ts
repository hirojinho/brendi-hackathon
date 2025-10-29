export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  generateResponse(message: string, history?: ChatMessage[], modelName?: string): Promise<string>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface PdfParserProvider {
  extract(filePath: string): Promise<{ title: string; pages: string[]; fullText: string }>; 
}

export interface StorageProvider {
  getUploadsDir(): string;
}


