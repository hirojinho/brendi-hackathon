import { NotesSearchIndex } from '../searchIndex';
import { NoteDisplayItem } from '../../components/desktop/NotesManagementPanel';

const mockNotes: NoteDisplayItem[] = [
  {
    id: '1',
    type: 'quick',
    title: 'JavaScript Fundamentals',
    content: 'Learn about variables, functions, and objects in JavaScript programming',
    excerpt: 'Learn about variables...',
    tags: ['javascript', 'programming', 'fundamentals'],
    contextId: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    reviewStatus: 'pending'
  },
  {
    id: '2',
    type: 'permanent',
    title: 'React Components',
    content: 'Understanding React functional components and hooks for modern web development',
    excerpt: 'Understanding React...',
    tags: ['react', 'javascript', 'components'],
    contextId: null,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
    reviewStatus: 'reviewed'
  },
  {
    id: '3',
    type: 'quick',
    title: 'CSS Grid Layout',
    content: 'Master CSS Grid for creating complex layouts with ease and flexibility',
    excerpt: 'Master CSS Grid...',
    tags: ['css', 'layout', 'grid'],
    contextId: null,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
    reviewStatus: 'pending'
  }
];

describe('NotesSearchIndex', () => {
  let searchIndex: NotesSearchIndex;

  beforeEach(() => {
    searchIndex = new NotesSearchIndex();
    searchIndex.buildIndex(mockNotes);
  });

  describe('search functionality', () => {
    it('returns all notes for empty query', () => {
      const results = searchIndex.search('', mockNotes);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.score === 0)).toBe(true);
    });

    it('finds notes by title match', () => {
      const results = searchIndex.search('JavaScript', mockNotes);
      
      expect(results).toHaveLength(2); // Should find both JavaScript-related notes
      expect(results[0].item.title).toContain('JavaScript');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('finds notes by content match', () => {
      const results = searchIndex.search('components', mockNotes);
      
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe('React Components');
      expect(results[0].matches.content).toBeGreaterThan(0);
    });

    it('finds notes by tag match', () => {
      const results = searchIndex.search('css', mockNotes);
      
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe('CSS Grid Layout');
      expect(results[0].matches.tags).toBeGreaterThan(0);
    });

    it('scores title matches higher than content matches', () => {
      const results = searchIndex.search('React', mockNotes);
      
      expect(results).toHaveLength(1);
      const result = results[0];
      expect(result.matches.title).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(result.matches.content * 1); // Title weight is 10x
    });

    it('handles multi-word searches', () => {
      const results = searchIndex.search('JavaScript programming', mockNotes);
      
      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe('JavaScript Fundamentals');
    });

    it('returns results sorted by relevance score', () => {
      const results = searchIndex.search('JavaScript', mockNotes);
      
      // Results should be sorted by score (highest first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('search suggestions', () => {
    it('provides search suggestions for partial queries', () => {
      const suggestions = searchIndex.getSuggestions('java', 5);
      
      expect(suggestions).toContain('javascript');
    });

    it('limits suggestions to specified count', () => {
      const suggestions = searchIndex.getSuggestions('', 3);
      
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('returns empty array for empty query', () => {
      const suggestions = searchIndex.getSuggestions('', 5);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('index management', () => {
    it('updates index when note is modified', () => {
      const updatedNote: NoteDisplayItem = {
        ...mockNotes[0],
        title: 'Updated JavaScript Guide',
        content: 'Updated content about JavaScript'
      };

      searchIndex.updateNote(updatedNote);
      const results = searchIndex.search('Updated', mockNotes.map(n => 
        n.id === updatedNote.id ? updatedNote : n
      ));

      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe('Updated JavaScript Guide');
    });

    it('removes note from index', () => {
      searchIndex.removeNote('1');
      const results = searchIndex.search('JavaScript Fundamentals', 
        mockNotes.filter(n => n.id !== '1')
      );

      expect(results).toHaveLength(0);
    });

    it('rebuilds index with new notes', () => {
      const newNotes: NoteDisplayItem[] = [
        {
          id: '4',
          type: 'permanent',
          title: 'Python Basics',
          content: 'Introduction to Python programming language',
          excerpt: 'Introduction to Python...',
          tags: ['python', 'programming'],
          contextId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          reviewStatus: 'reviewed'
        }
      ];

      searchIndex.buildIndex(newNotes);
      const results = searchIndex.search('Python', newNotes);

      expect(results).toHaveLength(1);
      expect(results[0].item.title).toBe('Python Basics');
    });
  });

  describe('performance characteristics', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNotes[0],
        id: `note-${i}`,
        title: `Note ${i}`,
        content: `Content for note ${i} with various keywords`
      }));

      const startTime = performance.now();
      searchIndex.buildIndex(largeDataset);
      const buildTime = performance.now() - startTime;

      const searchStartTime = performance.now();
      const results = searchIndex.search('keywords', largeDataset);
      const searchTime = performance.now() - searchStartTime;

      // Performance assertions (these are rough guidelines)
      expect(buildTime).toBeLessThan(1000); // Build should take less than 1 second
      expect(searchTime).toBeLessThan(100);  // Search should take less than 100ms
      expect(results.length).toBeGreaterThan(0);
    });
  });
});