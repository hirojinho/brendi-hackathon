import { Message } from './Message';
import type { ModelType } from '../../../types/chat';

/**
 * Domain model for Chat Session
 * Manages conversation state and history
 */
export class ChatSession {
  constructor(
    public readonly messages: readonly Message[],
    public readonly model: ModelType,
    public readonly modelName: string,
    public readonly useRag: boolean = false,
    public readonly maxChunks: number = 5
  ) {}

  /**
   * Add a message to the session
   * Returns a new ChatSession instance (immutable)
   */
  addMessage(message: Message): ChatSession {
    return new ChatSession(
      [...this.messages, message],
      this.model,
      this.modelName,
      this.useRag,
      this.maxChunks
    );
  }

  /**
   * Add multiple messages
   */
  addMessages(newMessages: Message[]): ChatSession {
    return new ChatSession(
      [...this.messages, ...newMessages],
      this.model,
      this.modelName,
      this.useRag,
      this.maxChunks
    );
  }

  /**
   * Clear all messages
   */
  clear(): ChatSession {
    return new ChatSession(
      [],
      this.model,
      this.modelName,
      this.useRag,
      this.maxChunks
    );
  }

  /**
   * Update model settings
   */
  updateSettings(settings: {
    model?: ModelType;
    modelName?: string;
    useRag?: boolean;
    maxChunks?: number;
  }): ChatSession {
    return new ChatSession(
      this.messages,
      settings.model ?? this.model,
      settings.modelName ?? this.modelName,
      settings.useRag ?? this.useRag,
      settings.maxChunks ?? this.maxChunks
    );
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get last message
   */
  getLastMessage(): Message | null {
    return this.messages[this.messages.length - 1] ?? null;
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: Message['role']): Message[] {
    return this.messages.filter(msg => msg.role === role);
  }

  /**
   * Get conversation history for API (without system messages)
   */
  getHistoryForAPI(): Array<{ role: Message['role']; content: string }> {
    return this.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => msg.toData());
  }
}
