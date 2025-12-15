import type { QuickNote as QuickNoteData } from '../../../types/review';

/**
 * Domain model for Quick Note
 * Encapsulates business logic for quick notes
 */
export class QuickNote {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly tags: readonly string[],
    public readonly contextId: string | null,
    public readonly createdAt: Date,
    public readonly lastModified: Date,
    public readonly isReviewRequired: boolean = false
  ) {}

  /**
   * Get note age in hours
   */
  getAgeInHours(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  /**
   * Get note age in days
   */
  getAgeInDays(): number {
    return Math.floor(this.getAgeInHours() / 24);
  }

  /**
   * Check if note is older than threshold (hours)
   */
  isOlderThan(hours: number): boolean {
    return this.getAgeInHours() >= hours;
  }

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
   * Check if note belongs to context
   */
  belongsToContext(contextId: string): boolean {
    return this.contextId === contextId;
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
   * Create from API data
   */
  static fromData(data: QuickNoteData): QuickNote {
    return new QuickNote(
      data.id,
      data.title,
      data.content,
      Object.freeze([...data.tags]), // Immutable copy
      data.contextId,
      new Date(data.createdAt),
      new Date(data.lastModified),
      data.isReviewRequired ?? false
    );
  }

  /**
   * Convert to API data format
   */
  toData(): QuickNoteData {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      tags: [...this.tags],
      contextId: this.contextId,
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString(),
      isReviewRequired: this.isReviewRequired,
    };
  }
}
