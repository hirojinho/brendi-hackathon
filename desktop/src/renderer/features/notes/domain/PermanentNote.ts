import type { PermanentNote as PermanentNoteData } from '../../../types/review';

/**
 * Domain model for Permanent Note
 * Encapsulates business logic for permanent notes
 */
export class PermanentNote {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly tags: readonly string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly sourceQuickNoteId?: string
  ) {}

  /**
   * Check if note has specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Check if note has any of the provided tags
   */
  hasAnyTag(tags: string[]): boolean {
    return tags.some(tag => this.hasTag(tag));
  }

  /**
   * Check if note was created from a quick note
   */
  isFromQuickNote(): boolean {
    return !!this.sourceQuickNoteId;
  }

  /**
   * Get excerpt of content (first N characters)
   */
  getExcerpt(maxLength: number = 100): string {
    if (this.content.length <= maxLength) {
      return this.content;
    }
    return this.content.substring(0, maxLength) + '...';
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
   * Format note for display
   */
  formatForDisplay(): string {
    const formattedDate = new Date(this.createdAt).toLocaleDateString();
    const formattedTags = this.tags.length > 0 ? `Tags: ${this.tags.join(', ')}` : '';
    
    let result = `Title: ${this.title}\nCreated: ${formattedDate}`;
    if (formattedTags) {
      result += `\n${formattedTags}`;
    }
    result += `\n\n${this.content}`;
    
    return result;
  }

  /**
   * Create from API data
   */
  static fromData(data: PermanentNoteData): PermanentNote {
    return new PermanentNote(
      data.id,
      data.title,
      data.content,
      Object.freeze([...data.tags]), // Immutable copy
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.sourceQuickNoteId
    );
  }

  /**
   * Convert to API data format
   */
  toData(): PermanentNoteData {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      tags: [...this.tags],
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      sourceQuickNoteId: this.sourceQuickNoteId,
    };
  }
}
