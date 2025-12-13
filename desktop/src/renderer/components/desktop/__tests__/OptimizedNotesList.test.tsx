import React from 'react';
import { render, screen } from '@testing-library/react';
import { OptimizedNotesList } from '../OptimizedNotesList';
import { NoteDisplayItem } from '../NotesManagementPanel';

// Mock performance monitor
jest.mock('../../../utils/performanceMonitor', () => ({
  performanceMonitor: {
    timeOperation: jest.fn((name, fn) => ({ result: fn() }))
  }
}));

const mockNotes: NoteDisplayItem[] = [
  {
    id: '1',
    type: 'quick',
    title: 'Test Note 1',
    content: 'This is test content for note 1',
    excerpt: 'This is test content...',
    tags: ['test', 'note'],
    contextId: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    reviewStatus: 'pending'
  },
  {
    id: '2',
    type: 'permanent',
    title: 'Test Note 2',
    content: 'This is test content for note 2',
    excerpt: 'This is test content...',
    tags: ['test', 'permanent'],
    contextId: null,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
    reviewStatus: 'reviewed'
  }
];

describe('OptimizedNotesList', () => {
  it('renders notes list correctly', () => {
    render(
      <OptimizedNotesList
        notes={mockNotes}
        searchQuery=""
        enableVirtualScrolling={false}
        enablePagination={false}
      />
    );

    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.getByText('Test Note 2')).toBeInTheDocument();
  });

  it('shows empty state when no notes', () => {
    render(
      <OptimizedNotesList
        notes={[]}
        searchQuery=""
        enableVirtualScrolling={false}
        enablePagination={false}
      />
    );

    expect(screen.getByText('No Notes Found')).toBeInTheDocument();
  });

  it('shows no results state when search has no matches', () => {
    render(
      <OptimizedNotesList
        notes={mockNotes}
        searchQuery="nonexistent"
        enableVirtualScrolling={false}
        enablePagination={false}
      />
    );

    expect(screen.getByText('No Results Found')).toBeInTheDocument();
  });

  it('enables virtual scrolling for large datasets', () => {
    const largeNoteSet = Array.from({ length: 150 }, (_, i) => ({
      ...mockNotes[0],
      id: `note-${i}`,
      title: `Note ${i}`
    }));

    render(
      <OptimizedNotesList
        notes={largeNoteSet}
        searchQuery=""
        enableVirtualScrolling={true}
        enablePagination={false}
        containerHeight={400}
      />
    );

    // Should render virtual scroll container
    expect(document.querySelector('.virtual-notes-list')).toBeInTheDocument();
  });

  it('enables pagination when specified', () => {
    const manyNotes = Array.from({ length: 75 }, (_, i) => ({
      ...mockNotes[0],
      id: `note-${i}`,
      title: `Note ${i}`
    }));

    render(
      <OptimizedNotesList
        notes={manyNotes}
        searchQuery=""
        enableVirtualScrolling={false}
        enablePagination={true}
        itemsPerPage={25}
      />
    );

    // Should show pagination controls
    expect(screen.getByText(/Showing \d+-\d+ of \d+ items/)).toBeInTheDocument();
  });
});