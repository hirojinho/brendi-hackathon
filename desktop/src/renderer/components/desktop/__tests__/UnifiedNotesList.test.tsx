import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedNotesList } from '../UnifiedNotesList';
import type { QuickNote } from '../../../services/quickNotesService';
import type { PermanentNote } from '../../../services/permanentNotesService';
import type { Context } from '../../../services/contextsService';

// Mock the SearchHighlighter component
jest.mock('../../common', () => ({
  SearchHighlighter: ({ text, searchQuery }: { text: string; searchQuery: string }) => {
    if (!searchQuery) return <span>{text}</span>;
    const highlighted = text.replace(
      new RegExp(`(${searchQuery})`, 'gi'),
      '<mark>$1</mark>'
    );
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
}));

describe('UnifiedNotesList', () => {
  const mockContexts: Context[] = [
    {
      id: 'ctx1',
      name: 'Work',
      description: 'Work context',
      parentId: null,
      createdAt: '2023-01-01T00:00:00Z',
      lastModified: '2023-01-01T00:00:00Z'
    }
  ];

  const mockQuickNote: QuickNote = {
    id: 'quick1',
    title: 'Quick Note 1',
    content: 'This is a quick note content',
    tags: ['urgent', 'work'],
    contextId: 'ctx1',
    createdAt: '2023-01-01T10:00:00Z',
    lastModified: '2023-01-01T11:00:00Z'
  };

  const mockPermanentNote: PermanentNote = {
    id: 'perm1',
    title: 'Permanent Note 1',
    content: 'This is a permanent note content',
    tags: ['important'],
    createdAt: '2023-01-01T09:00:00Z',
    updatedAt: '2023-01-01T10:30:00Z'
  };

  const defaultProps = {
    notes: [mockQuickNote, mockPermanentNote],
    contexts: mockContexts,
    onNoteClick: jest.fn(),
    onNoteEdit: jest.fn(),
    onNoteDelete: jest.fn(),
    onNoteSelect: jest.fn(),
    onBulkAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notes correctly', () => {
    render(<UnifiedNotesList {...defaultProps} />);
    
    expect(screen.getByText('Quick Note 1')).toBeInTheDocument();
    expect(screen.getByText('Permanent Note 1')).toBeInTheDocument();
    expect(screen.getByText('This is a quick note content')).toBeInTheDocument();
    expect(screen.getByText('This is a permanent note content')).toBeInTheDocument();
  });

  it('displays note type badges correctly', () => {
    render(<UnifiedNotesList {...defaultProps} />);
    
    const quickBadge = screen.getByText('Q');
    const permanentBadge = screen.getByText('P');
    
    expect(quickBadge).toBeInTheDocument();
    expect(permanentBadge).toBeInTheDocument();
    expect(quickBadge.closest('.note-type-badge')).toHaveClass('quick');
    expect(permanentBadge.closest('.note-type-badge')).toHaveClass('permanent');
  });

  it('displays tags correctly', () => {
    render(<UnifiedNotesList {...defaultProps} />);
    
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
  });

  it('displays context information for quick notes', () => {
    render(<UnifiedNotesList {...defaultProps} />);
    
    expect(screen.getByText('📁 Work')).toBeInTheDocument();
  });

  it('handles note click events', () => {
    const onNoteClick = jest.fn();
    render(<UnifiedNotesList {...defaultProps} onNoteClick={onNoteClick} />);
    
    const noteCard = screen.getByText('Quick Note 1').closest('.unified-note-card');
    fireEvent.click(noteCard!);
    
    expect(onNoteClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'quick1',
        type: 'quick',
        title: 'Quick Note 1'
      })
    );
  });

  it('handles edit button clicks', () => {
    const onNoteEdit = jest.fn();
    render(<UnifiedNotesList {...defaultProps} onNoteEdit={onNoteEdit} />);
    
    const editButtons = screen.getAllByTitle('Edit note');
    fireEvent.click(editButtons[0]);
    
    expect(onNoteEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'quick1',
        type: 'quick',
        title: 'Quick Note 1'
      })
    );
  });

  it('handles delete button clicks', () => {
    const onNoteDelete = jest.fn();
    render(<UnifiedNotesList {...defaultProps} onNoteDelete={onNoteDelete} />);
    
    const deleteButtons = screen.getAllByTitle('Delete note');
    fireEvent.click(deleteButtons[0]);
    
    expect(onNoteDelete).toHaveBeenCalledWith('quick1');
  });

  it('shows bulk selection mode correctly', () => {
    render(<UnifiedNotesList {...defaultProps} bulkSelectionMode={true} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('handles bulk selection', () => {
    const onNoteSelect = jest.fn();
    render(
      <UnifiedNotesList 
        {...defaultProps} 
        bulkSelectionMode={true}
        onNoteSelect={onNoteSelect}
      />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(onNoteSelect).toHaveBeenCalledWith('quick1', true);
  });

  it('shows empty state when no notes', () => {
    render(<UnifiedNotesList {...defaultProps} notes={[]} />);
    
    expect(screen.getByText('No notes found')).toBeInTheDocument();
    expect(screen.getByText('Create your first note to get started')).toBeInTheDocument();
  });

  it('shows search-specific empty state', () => {
    render(<UnifiedNotesList {...defaultProps} notes={[]} searchQuery="test query" />);
    
    expect(screen.getByText('No notes found')).toBeInTheDocument();
    expect(screen.getByText('No notes match "test query"')).toBeInTheDocument();
  });

  it('highlights search terms when provided', () => {
    render(<UnifiedNotesList {...defaultProps} searchQuery="quick" highlightMatches={true} />);
    
    // The SearchHighlighter should highlight the search term "Quick" in the title
    expect(screen.getByText('Quick')).toBeInTheDocument();
    expect(screen.getByText('Quick').tagName).toBe('MARK');
    
    // Also check that "quick" is highlighted in the content
    const quickMarks = screen.getAllByText('quick');
    expect(quickMarks.length).toBeGreaterThan(0);
    expect(quickMarks[0].tagName).toBe('MARK');
  });

  it('supports keyboard navigation', () => {
    render(<UnifiedNotesList {...defaultProps} />);
    
    const listElement = screen.getByRole('list');
    
    // Test arrow down navigation
    fireEvent.keyDown(listElement, { key: 'ArrowDown' });
    // Note: Testing focus changes would require more complex setup
    
    // Test Enter key
    fireEvent.keyDown(listElement, { key: 'Enter' });
    // The first note should be clicked when Enter is pressed at index 0
  });

  it('displays review status indicators', () => {
    const quickNoteWithReview = {
      ...mockQuickNote,
      isReviewRequired: true
    };
    
    render(<UnifiedNotesList {...defaultProps} notes={[quickNoteWithReview]} />);
    
    expect(screen.getByTitle('Review Required')).toBeInTheDocument();
  });
});