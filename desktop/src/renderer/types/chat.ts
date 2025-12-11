export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type ModelType = 'openai' | 'openrouter' | 'ollama';

export interface ChatRequest {
  message: string;
  history: Message[];
  model: ModelType;
  modelName?: string;
  useRag?: boolean;
  maxChunks?: number;
}

export interface ChatResponse {
  response: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  currentResponse: string;
  model: ModelType;
  useRag: boolean;
  maxChunks: number;
}

