/**
 * Domain model for Chat Message
 */
export type MessageRole = 'user' | 'assistant' | 'system';

export class Message {
  constructor(
    public readonly role: MessageRole,
    public readonly content: string,
    public readonly timestamp: Date = new Date()
  ) {}

  /**
   * Check if message is from user
   */
  isUser(): boolean {
    return this.role === 'user';
  }

  /**
   * Check if message is from assistant
   */
  isAssistant(): boolean {
    return this.role === 'assistant';
  }

  /**
   * Check if message is system message
   */
  isSystem(): boolean {
    return this.role === 'system';
  }

  /**
   * Get word count
   */
  getWordCount(): number {
    return this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Get character count
   */
  getCharacterCount(): number {
    return this.content.length;
  }

  /**
   * Check if message is empty
   */
  isEmpty(): boolean {
    return this.content.trim().length === 0;
  }

  /**
   * Create from API data
   */
  static fromData(data: { role: MessageRole; content: string }): Message {
    return new Message(data.role, data.content);
  }

  /**
   * Convert to API data format
   */
  toData(): { role: MessageRole; content: string } {
    return {
      role: this.role,
      content: this.content,
    };
  }
}
