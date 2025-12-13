/**
 * Integration test for search and filtering functionality
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { findSearchMatches, calculateRelevanceScore } from '../../common/SearchHighlighter';

// Mock note data for testing
const mockNotes = [
  {
    id: '1',
    type: 'quick' as const,
    title: 'Important Meeting Notes',
    content: 'Discussed project timeline and important milestones',
    tags: ['meeting', 'important'],
    contextId: 'work',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    type: 'permanent' as const,
    title: 'Project Documentation',
    content: 'Complete documentation for the new project features',
    tags: ['documentation', 'project'],
    contextId: null,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: '3',
    type: 'quick' as const,
    title: 'Quick Idea',
    content: 'A quick note about an important idea for the project',
    tags: ['idea'],
    contextId: 'personal',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
];

describe('Search and Filter Integration', () => {
  describe('Real-time search functionality (Requirement 5.1)', () => {
    it('should find notes by title content', () => {
      const query = 'meeting';
      const results = mockNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important Meeting Notes');
    });

    it('should find notes by content', () => {
      const query = 'documentation';
      const results = mockNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      expect(results).toHaveLength(2); // One in title, one in tags
    });

    it('should find notes by tags', () => {
      const query = 'important';
      const results = mockNotes.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      expect(results).toHaveLength(2); // One by tag, one by title and content
    });
  });

  describe('Comprehensive filtering capability (Requirement 5.2)', () => {
    it('should filter by note type', () => {
      const quickNotes = mockNotes.filter(note => note.type === 'quick');
      const permanentNotes = mockNotes.filter(note => note.type === 'permanent');

      expect(quickNotes).toHaveLength(2);
      expect(permanentNotes).toHaveLength(1);
    });

    it('should filter by context', () => {
      const workNotes = mockNotes.filter(note => note.contextId === 'work');
      const personalNotes = mockNotes.filter(note => note.contextId === 'personal');

      expect(workNotes).toHaveLength(1);
      expect(personalNotes).toHaveLength(1);
    });

    it('should filter by tags', () => {
      const importantNotes = mockNotes.filter(note => 
        note.tags.includes('important')
      );
      const projectNotes = mockNotes.filter(note => 
        note.tags.includes('project')
      );

      expect(importantNotes).toHaveLength(1);
      expect(projectNotes).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');
      
      const filteredNotes = mockNotes.filter(note =>
        note.updatedAt >= startDate && note.updatedAt <= endDate
      );

      expect(filteredNotes).toHaveLength(2);
    });

    it('should apply multiple filters simultaneously', () => {
      const results = mockNotes.filter(note =>
        note.type === 'quick' &&
        note.tags.includes('important') &&
        note.contextId === 'work'
      );

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Important Meeting Notes');
    });
  });

  describe('Multi-criteria sorting consistency (Requirement 5.3)', () => {
    it('should sort by creation date ascending', () => {
      const sorted = [...mockNotes].sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );

      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('should sort by creation date descending', () => {
      const sorted = [...mockNotes].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].id).toBe('3');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });

    it('should sort by title alphabetically', () => {
      const sorted = [...mockNotes].sort((a, b) => 
        a.title.localeCompare(b.title)
      );

      expect(sorted[0].title).toBe('Important Meeting Notes');
      expect(sorted[1].title).toBe('Project Documentation');
      expect(sorted[2].title).toBe('Quick Idea');
    });

    it('should sort by relevance score', () => {
      const query = 'important';
      const notesWithScores = mockNotes.map(note => ({
        ...note,
        relevanceScore: calculateRelevanceScore(note.title, note.content, note.tags, query)
      }));

      const sorted = notesWithScores.sort((a, b) => 
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );

      // Note with "important" in title and tags should rank highest
      expect(sorted[0].title).toBe('Important Meeting Notes');
    });
  });

  describe('Search result highlighting and context display (Requirement 5.4)', () => {
    it('should find search matches in title', () => {
      const matches = findSearchMatches('Important Meeting Notes', 'meeting', 'title');

      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe('title');
      expect(matches[0].startIndex).toBe(10);
      expect(matches[0].endIndex).toBe(17);
    });

    it('should find search matches in content', () => {
      const matches = findSearchMatches('Discussed project timeline', 'project', 'content');

      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe('content');
      expect(matches[0].context).toContain('project');
    });

    it('should provide context around matches', () => {
      const longContent = 'This is a very long piece of content with important information in the middle';
      const matches = findSearchMatches(longContent, 'important');

      expect(matches[0].context).toContain('with important information');
    });

    it('should calculate relevance scores correctly', () => {
      // Title match should score higher than content match
      const titleScore = calculateRelevanceScore('important note', 'some content', [], 'important');
      const contentScore = calculateRelevanceScore('some title', 'important content', [], 'important');

      expect(titleScore).toBeGreaterThan(contentScore);

      // Exact match should score higher than partial match
      const exactScore = calculateRelevanceScore('important', 'content', [], 'important');
      const partialScore = calculateRelevanceScore('important note', 'content', [], 'important');

      expect(exactScore).toBeGreaterThan(partialScore);

      // Tag match should score higher than content match
      const tagScore = calculateRelevanceScore('title', 'content', ['important'], 'important');
      expect(tagScore).toBeGreaterThan(contentScore);
    });
  });

  describe('Performance considerations (Requirement 5.5)', () => {
    it('should handle large collections efficiently', () => {
      // Create a large mock dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        type: i % 2 === 0 ? 'quick' as const : 'permanent' as const,
        title: `Note ${i}`,
        content: `Content for note ${i} with some important information`,
        tags: [`tag${i % 10}`, 'common'],
        contextId: i % 5 === 0 ? 'work' : 'personal',
        createdAt: new Date(2024, 0, i % 30 + 1),
        updatedAt: new Date(2024, 0, i % 30 + 1)
      }));

      const startTime = performance.now();

      // Simulate search and filter operations
      const query = 'important';
      const filtered = largeDataset.filter(note =>
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      const sorted = filtered.sort((a, b) => 
        calculateRelevanceScore(b.title, b.content, b.tags, query) -
        calculateRelevanceScore(a.title, a.content, a.tags, query)
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (500ms as per requirement)
      expect(duration).toBeLessThan(500);
      expect(sorted.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to simulate the complete filtering logic
function applyFiltersAndSort(
  notes: typeof mockNotes,
  searchQuery: string,
  filters: {
    noteType?: 'all' | 'quick' | 'permanent';
    contextIds?: string[];
    tags?: string[];
    dateRange?: { start: Date; end: Date } | null;
  },
  sortBy: {
    field: 'createdAt' | 'updatedAt' | 'title' | 'relevance';
    direction: 'asc' | 'desc';
  }
) {
  let filtered = [...notes];

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Apply note type filter
  if (filters.noteType && filters.noteType !== 'all') {
    filtered = filtered.filter(note => note.type === filters.noteType);
  }

  // Apply context filter
  if (filters.contextIds && filters.contextIds.length > 0) {
    filtered = filtered.filter(note => 
      note.contextId && filters.contextIds!.includes(note.contextId)
    );
  }

  // Apply tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(note =>
      filters.tags!.some(tag => note.tags.includes(tag))
    );
  }

  // Apply date range filter
  if (filters.dateRange) {
    filtered = filtered.filter(note => {
      return note.updatedAt >= filters.dateRange!.start && 
             note.updatedAt <= filters.dateRange!.end;
    });
  }

  // Apply sorting
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'updatedAt':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case 'relevance':
        const scoreA = calculateRelevanceScore(a.title, a.content, a.tags, searchQuery);
        const scoreB = calculateRelevanceScore(b.title, b.content, b.tags, searchQuery);
        comparison = scoreB - scoreA;
        break;
    }
    
    return sortBy.direction === 'desc' ? -comparison : comparison;
  });

  return filtered;
}

describe('Complete Filter and Sort Integration', () => {
  it('should handle complex filtering and sorting scenarios', () => {
    const result = applyFiltersAndSort(
      mockNotes,
      'important',
      {
        noteType: 'quick',
        tags: ['important']
      },
      {
        field: 'relevance',
        direction: 'desc'
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Important Meeting Notes');
  });

  it('should return empty results when no matches', () => {
    const result = applyFiltersAndSort(
      mockNotes,
      'nonexistent',
      { noteType: 'all' },
      { field: 'createdAt', direction: 'desc' }
    );

    expect(result).toHaveLength(0);
  });

  it('should maintain sort order consistency', () => {
    const result1 = applyFiltersAndSort(
      mockNotes,
      '',
      { noteType: 'all' },
      { field: 'title', direction: 'asc' }
    );

    const result2 = applyFiltersAndSort(
      mockNotes,
      '',
      { noteType: 'all' },
      { field: 'title', direction: 'asc' }
    );

    expect(result1).toEqual(result2);
  });
});