import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchHighlighter, findSearchMatches, calculateRelevanceScore } from '../SearchHighlighter';

describe('SearchHighlighter', () => {
  it('renders text without highlighting when no search query', () => {
    render(<SearchHighlighter text="Hello world" searchQuery="" />);
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByRole('mark')).not.toBeInTheDocument();
  });

  it('highlights search matches in text', () => {
    render(<SearchHighlighter text="Hello world" searchQuery="world" />);
    
    // Check that the text contains both parts
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('world').tagName).toBe('MARK');
  });

  it('truncates long text when no search query', () => {
    const longText = 'a'.repeat(300);
    render(<SearchHighlighter text={longText} searchQuery="" maxLength={100} />);
    
    const displayedText = screen.getByText(/a+\.\.\./);
    expect(displayedText.textContent?.length).toBeLessThanOrEqual(103); // 100 + "..."
  });

  it('shows context around search matches', () => {
    const longText = 'This is a very long text with some important information in the middle that we want to find';
    render(<SearchHighlighter text={longText} searchQuery="important" contextLength={20} />);
    
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('important').tagName).toBe('MARK');
    // Should show context around the match
    expect(screen.getByText(/with some/)).toBeInTheDocument();
    expect(screen.getByText(/information in/)).toBeInTheDocument();
  });

  it('adds ellipsis when showing context from middle of text', () => {
    const longText = 'This is a very long text with some important information in the middle that we want to find and more text after';
    render(<SearchHighlighter text={longText} searchQuery="important" contextLength={15} />);
    
    const container = screen.getByText(/\.\.\./);
    expect(container.textContent).toMatch(/^\.\.\./); // Starts with ellipsis
    expect(container.textContent).toMatch(/\.\.\.$/) // Ends with ellipsis
  });

  it('handles case-insensitive search', () => {
    render(<SearchHighlighter text="Hello World" searchQuery="WORLD" />);
    
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('World').tagName).toBe('MARK');
  });

  it('returns original text when no matches found', () => {
    render(<SearchHighlighter text="Hello world" searchQuery="xyz" />);
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByRole('mark')).not.toBeInTheDocument();
  });
});

describe('findSearchMatches', () => {
  it('finds single match in text', () => {
    const matches = findSearchMatches('Hello world', 'world');
    
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      field: 'content',
      startIndex: 6,
      endIndex: 11,
      context: 'Hello world'
    });
  });

  it('finds multiple matches in text', () => {
    const matches = findSearchMatches('Hello world, wonderful world', 'world');
    
    expect(matches).toHaveLength(2);
    expect(matches[0].startIndex).toBe(6);
    expect(matches[1].startIndex).toBe(23);
  });

  it('returns empty array when no matches', () => {
    const matches = findSearchMatches('Hello world', 'xyz');
    
    expect(matches).toHaveLength(0);
  });

  it('handles empty search query', () => {
    const matches = findSearchMatches('Hello world', '');
    
    expect(matches).toHaveLength(0);
  });

  it('provides context around matches', () => {
    const longText = 'This is a very long text with important information';
    const matches = findSearchMatches(longText, 'important');
    
    expect(matches[0].context).toContain('with important information');
  });

  it('sets correct field type', () => {
    const matches = findSearchMatches('Hello world', 'world', 'title');
    
    expect(matches[0].field).toBe('title');
  });
});

describe('calculateRelevanceScore', () => {
  it('gives higher score for title matches', () => {
    const titleScore = calculateRelevanceScore('important note', 'some content', [], 'important');
    const contentScore = calculateRelevanceScore('some title', 'important content', [], 'important');
    
    expect(titleScore).toBeGreaterThan(contentScore);
  });

  it('gives highest score for exact title match', () => {
    const exactScore = calculateRelevanceScore('important', 'some content', [], 'important');
    const partialScore = calculateRelevanceScore('important note', 'some content', [], 'important');
    
    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('gives bonus for title starting with query', () => {
    const startsWithScore = calculateRelevanceScore('important note', 'some content', [], 'important');
    const containsScore = calculateRelevanceScore('very important note', 'some content', [], 'important');
    
    expect(startsWithScore).toBeGreaterThan(containsScore);
  });

  it('scores tag matches higher than content matches', () => {
    const tagScore = calculateRelevanceScore('some title', 'some content', ['important'], 'important');
    const contentScore = calculateRelevanceScore('some title', 'important content', [], 'important');
    
    expect(tagScore).toBeGreaterThan(contentScore);
  });

  it('gives bonus for exact tag match', () => {
    const exactTagScore = calculateRelevanceScore('title', 'content', ['important'], 'important');
    const partialTagScore = calculateRelevanceScore('title', 'content', ['important-note'], 'important');
    
    expect(exactTagScore).toBeGreaterThan(partialTagScore);
  });

  it('returns 0 for empty search query', () => {
    const score = calculateRelevanceScore('title', 'content', ['tag'], '');
    
    expect(score).toBe(0);
  });

  it('accumulates scores from multiple matches', () => {
    const multipleScore = calculateRelevanceScore(
      'important note about important things', 
      'important content with important details', 
      ['important', 'notes'], 
      'important'
    );
    const singleScore = calculateRelevanceScore('note', 'important content', [], 'important');
    
    expect(multipleScore).toBeGreaterThan(singleScore);
  });
});