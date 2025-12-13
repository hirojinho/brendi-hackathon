import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchAndFilterBar, NoteFilters, SortOption } from '../SearchAndFilterBar';

// Mock data for testing
const mockContexts = [
  { id: '1', name: 'Work', description: 'Work-related notes', parentId: null, createdAt: '2024-01-01', lastModified: '2024-01-01' },
  { id: '2', name: 'Personal', description: 'Personal notes', parentId: null, createdAt: '2024-01-01', lastModified: '2024-01-01' }
];

const mockTags = ['important', 'todo', 'meeting', 'idea'];

const defaultFilters: NoteFilters = {
  noteType: 'all',
  contextIds: [],
  tags: [],
  dateRange: null,
  reviewStatus: []
};

const defaultSort: SortOption = {
  field: 'createdAt',
  direction: 'desc'
};

describe('SearchAndFilterBar', () => {
  const mockProps = {
    searchQuery: '',
    onSearchChange: jest.fn(),
    filters: defaultFilters,
    onFilterChange: jest.fn(),
    sortBy: defaultSort,
    onSortChange: jest.fn(),
    showAdvancedFilters: false,
    onToggleAdvancedFilters: jest.fn(),
    contexts: mockContexts,
    availableTags: mockTags,
    totalNotesCount: 10,
    filteredNotesCount: 8
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search notes by title, content, or tags...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls onSearchChange with debounced input', async () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search notes by title, content, or tags...');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Should not call immediately
    expect(mockProps.onSearchChange).not.toHaveBeenCalled();
    
    // Should call after debounce delay
    await waitFor(() => {
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('test query');
    }, { timeout: 500 });
  });

  it('displays results summary correctly', () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    expect(screen.getByText('8 of 10 notes')).toBeInTheDocument();
  });

  it('shows all notes when filtered count equals total', () => {
    const props = { ...mockProps, filteredNotesCount: 10 };
    render(<SearchAndFilterBar {...props} />);
    
    expect(screen.getByText('10 notes')).toBeInTheDocument();
  });

  it('toggles advanced filters panel', () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    expect(mockProps.onToggleAdvancedFilters).toHaveBeenCalledWith(true);
  });

  it('shows advanced filters when enabled', () => {
    const props = { ...mockProps, showAdvancedFilters: true };
    render(<SearchAndFilterBar {...props} />);
    
    expect(screen.getByText('Note Type')).toBeInTheDocument();
    expect(screen.getByText('Contexts')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Review Status')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('handles sort field changes', () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    const sortSelect = screen.getByDisplayValue('Created Date');
    fireEvent.change(sortSelect, { target: { value: 'title' } });
    
    expect(mockProps.onSortChange).toHaveBeenCalledWith({
      field: 'title',
      direction: 'desc'
    });
  });

  it('toggles sort direction', () => {
    render(<SearchAndFilterBar {...mockProps} />);
    
    const sortDirectionButton = screen.getByTitle('Sort Ascending');
    fireEvent.click(sortDirectionButton);
    
    expect(mockProps.onSortChange).toHaveBeenCalledWith({
      field: 'createdAt',
      direction: 'asc'
    });
  });

  it('handles note type filter changes', () => {
    const props = { ...mockProps, showAdvancedFilters: true };
    render(<SearchAndFilterBar {...props} />);
    
    const quickNotesButton = screen.getByText('Quick Notes');
    fireEvent.click(quickNotesButton);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      noteType: 'quick'
    });
  });

  it('handles context filter toggles', () => {
    const props = { ...mockProps, showAdvancedFilters: true };
    render(<SearchAndFilterBar {...props} />);
    
    const workContextButton = screen.getByText('Work');
    fireEvent.click(workContextButton);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      contextIds: ['1']
    });
  });

  it('handles tag filter toggles', () => {
    const props = { ...mockProps, showAdvancedFilters: true };
    render(<SearchAndFilterBar {...props} />);
    
    const importantTagButton = screen.getByText('#important');
    fireEvent.click(importantTagButton);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      tags: ['important']
    });
  });

  it('shows clear filters button when filters are active', () => {
    const activeFilters = { ...defaultFilters, noteType: 'quick' as const };
    const props = { ...mockProps, filters: activeFilters };
    render(<SearchAndFilterBar {...props} />);
    
    expect(screen.getByText('Clear all filters')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const activeFilters = { ...defaultFilters, noteType: 'quick' as const };
    const props = { ...mockProps, filters: activeFilters, searchQuery: 'test' };
    render(<SearchAndFilterBar {...props} />);
    
    const clearButton = screen.getByText('Clear all filters');
    fireEvent.click(clearButton);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith(defaultFilters);
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('');
  });

  it('shows active indicator when filters are applied', () => {
    const activeFilters = { ...defaultFilters, tags: ['important'] };
    const props = { ...mockProps, filters: activeFilters };
    render(<SearchAndFilterBar {...props} />);
    
    const filtersButton = screen.getByText('Filters');
    expect(filtersButton.querySelector('.active-indicator')).toBeInTheDocument();
  });
});