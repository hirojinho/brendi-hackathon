import { NoteDisplayItem } from '../components/desktop/NotesManagementPanel';

export interface SearchIndex {
  id: string;
  title: string;
  content: string;
  tags: string[];
  searchableText: string;
  titleWords: string[];
  contentWords: string[];
  tagWords: string[];
}

export interface SearchResult {
  item: NoteDisplayItem;
  score: number;
  matches: {
    title: number;
    content: number;
    tags: number;
  };
}

export class NotesSearchIndex {
  private index: Map<string, SearchIndex> = new Map();
  private wordToNotes: Map<string, Set<string>> = new Map();

  /**
   * Build search index from notes
   */
  buildIndex(notes: NoteDisplayItem[]): void {
    this.index.clear();
    this.wordToNotes.clear();

    for (const note of notes) {
      const searchIndex = this.createSearchIndex(note);
      this.index.set(note.id, searchIndex);
      this.indexWords(note.id, searchIndex);
    }
  }

  /**
   * Update index for a single note
   */
  updateNote(note: NoteDisplayItem): void {
    // Remove old index if exists
    if (this.index.has(note.id)) {
      this.removeNoteFromWordIndex(note.id);
    }

    // Add new index
    const searchIndex = this.createSearchIndex(note);
    this.index.set(note.id, searchIndex);
    this.indexWords(note.id, searchIndex);
  }

  /**
   * Remove note from index
   */
  removeNote(noteId: string): void {
    if (this.index.has(noteId)) {
      this.removeNoteFromWordIndex(noteId);
      this.index.delete(noteId);
    }
  }

  /**
   * Search notes with scoring
   */
  search(query: string, notes: NoteDisplayItem[]): SearchResult[] {
    if (!query.trim()) {
      return notes.map(note => ({
        item: note,
        score: 0,
        matches: { title: 0, content: 0, tags: 0 }
      }));
    }

    const searchTerms = this.normalizeQuery(query);
    const results: SearchResult[] = [];

    // Get candidate notes using word index for performance
    const candidateIds = this.getCandidateNotes(searchTerms);

    for (const note of notes) {
      if (candidateIds.size > 0 && !candidateIds.has(note.id)) {
        continue; // Skip notes that don't contain any search terms
      }

      const searchIndex = this.index.get(note.id);
      if (!searchIndex) {
        continue;
      }

      const result = this.scoreNote(searchIndex, searchTerms, note);
      if (result.score > 0) {
        results.push(result);
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get search suggestions based on partial query
   */
  getSuggestions(partialQuery: string, limit: number = 5): string[] {
    const query = partialQuery.toLowerCase().trim();
    if (!query) return [];

    const suggestions = new Set<string>();
    
    for (const word of this.wordToNotes.keys()) {
      if (word.startsWith(query) && suggestions.size < limit) {
        suggestions.add(word);
      }
    }

    return Array.from(suggestions).sort();
  }

  private createSearchIndex(note: NoteDisplayItem): SearchIndex {
    const titleWords = this.tokenize(note.title);
    const contentWords = this.tokenize(note.content);
    const tagWords = note.tags.flatMap(tag => this.tokenize(tag));
    
    const searchableText = [
      note.title,
      note.content,
      ...note.tags
    ].join(' ').toLowerCase();

    return {
      id: note.id,
      title: note.title.toLowerCase(),
      content: note.content.toLowerCase(),
      tags: note.tags.map(tag => tag.toLowerCase()),
      searchableText,
      titleWords,
      contentWords,
      tagWords
    };
  }

  private indexWords(noteId: string, searchIndex: SearchIndex): void {
    const allWords = [
      ...searchIndex.titleWords,
      ...searchIndex.contentWords,
      ...searchIndex.tagWords
    ];

    for (const word of allWords) {
      if (!this.wordToNotes.has(word)) {
        this.wordToNotes.set(word, new Set());
      }
      this.wordToNotes.get(word)!.add(noteId);
    }
  }

  private removeNoteFromWordIndex(noteId: string): void {
    for (const noteSet of this.wordToNotes.values()) {
      noteSet.delete(noteId);
    }
  }

  private getCandidateNotes(searchTerms: string[]): Set<string> {
    const candidates = new Set<string>();
    
    for (const term of searchTerms) {
      const exactMatches = this.wordToNotes.get(term);
      if (exactMatches) {
        exactMatches.forEach(id => candidates.add(id));
      }

      // Also check for partial matches (prefix search)
      for (const [word, noteIds] of this.wordToNotes.entries()) {
        if (word.includes(term)) {
          noteIds.forEach(id => candidates.add(id));
        }
      }
    }

    return candidates;
  }

  private scoreNote(
    searchIndex: SearchIndex, 
    searchTerms: string[], 
    note: NoteDisplayItem
  ): SearchResult {
    let totalScore = 0;
    const matches = { title: 0, content: 0, tags: 0 };

    for (const term of searchTerms) {
      // Title matches (highest weight)
      const titleMatches = this.countMatches(searchIndex.title, term);
      if (titleMatches > 0) {
        matches.title += titleMatches;
        totalScore += titleMatches * 10; // Title matches are worth 10x
      }

      // Tag matches (high weight)
      const tagMatches = searchIndex.tags.reduce(
        (sum, tag) => sum + this.countMatches(tag, term), 0
      );
      if (tagMatches > 0) {
        matches.tags += tagMatches;
        totalScore += tagMatches * 5; // Tag matches are worth 5x
      }

      // Content matches (base weight)
      const contentMatches = this.countMatches(searchIndex.content, term);
      if (contentMatches > 0) {
        matches.content += contentMatches;
        totalScore += contentMatches * 1; // Content matches are base weight
      }
    }

    // Boost score for exact phrase matches
    const fullQuery = searchTerms.join(' ');
    if (searchIndex.searchableText.includes(fullQuery)) {
      totalScore *= 1.5;
    }

    // Boost score for shorter notes (more relevant)
    const lengthBoost = Math.max(0.5, 1 - (note.content.length / 10000));
    totalScore *= lengthBoost;

    return {
      item: note,
      score: totalScore,
      matches
    };
  }

  private countMatches(text: string, term: string): number {
    const regex = new RegExp(this.escapeRegex(term), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  private normalizeQuery(query: string): string[] {
    return this.tokenize(query);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 1) // Filter out single characters
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);
    return stopWords.has(word);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}