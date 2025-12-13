import React from 'react';

export interface SearchMatch {
  field: 'title' | 'content';
  startIndex: number;
  endIndex: number;
  context: string;
}

export interface SearchHighlighterProps {
  text: string;
  searchQuery: string;
  className?: string;
  maxLength?: number;
  contextLength?: number;
}

/**
 * Component for highlighting search terms in text
 * Requirements: 5.4 - Add search result highlighting and context display
 */
export const SearchHighlighter: React.FC<SearchHighlighterProps> = ({
  text,
  searchQuery,
  className = '',
  maxLength = 200,
  contextLength = 50
}) => {
  if (!searchQuery || !searchQuery.trim()) {
    // No search query, return truncated text
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className={className}>{truncated}</span>;
  }

  const query = searchQuery.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Find all matches
  const matches: { start: number; end: number }[] = [];
  let searchIndex = 0;
  
  while (searchIndex < lowerText.length) {
    const matchIndex = lowerText.indexOf(query, searchIndex);
    if (matchIndex === -1) break;
    
    matches.push({
      start: matchIndex,
      end: matchIndex + query.length
    });
    
    searchIndex = matchIndex + 1;
  }

  if (matches.length === 0) {
    // No matches found, return truncated text
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className={className}>{truncated}</span>;
  }

  // Find the best match to show (first one for now)
  const bestMatch = matches[0];
  
  // Calculate context window around the match
  const contextStart = Math.max(0, bestMatch.start - contextLength);
  const contextEnd = Math.min(text.length, bestMatch.end + contextLength);
  
  // Extract the context text
  let contextText = text.substring(contextStart, contextEnd);
  
  // Adjust match positions relative to context
  const adjustedStart = bestMatch.start - contextStart;
  const adjustedEnd = bestMatch.end - contextStart;
  
  // Add ellipsis if we're not at the beginning/end
  const prefix = contextStart > 0 ? '...' : '';
  const suffix = contextEnd < text.length ? '...' : '';
  
  // Build the highlighted text
  const beforeMatch = contextText.substring(0, adjustedStart);
  const matchText = contextText.substring(adjustedStart, adjustedEnd);
  const afterMatch = contextText.substring(adjustedEnd);

  return (
    <span className={className}>
      {prefix}
      {beforeMatch}
      <mark className="search-highlight">{matchText}</mark>
      {afterMatch}
      {suffix}
    </span>
  );
};

/**
 * Utility function to find search matches in text
 * Requirements: 5.4 - Add search result highlighting and context display
 */
export const findSearchMatches = (
  text: string, 
  searchQuery: string, 
  field: 'title' | 'content' = 'content'
): SearchMatch[] => {
  if (!searchQuery || !searchQuery.trim()) {
    return [];
  }

  const query = searchQuery.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  const matches: SearchMatch[] = [];
  let searchIndex = 0;
  
  while (searchIndex < lowerText.length) {
    const matchIndex = lowerText.indexOf(query, searchIndex);
    if (matchIndex === -1) break;
    
    const contextStart = Math.max(0, matchIndex - 30);
    const contextEnd = Math.min(text.length, matchIndex + query.length + 30);
    const context = text.substring(contextStart, contextEnd);
    
    matches.push({
      field,
      startIndex: matchIndex,
      endIndex: matchIndex + query.length,
      context: (contextStart > 0 ? '...' : '') + context + (contextEnd < text.length ? '...' : '')
    });
    
    searchIndex = matchIndex + 1;
  }

  return matches;
};

/**
 * Utility function to calculate search relevance score
 * Requirements: 5.3 - Implement multi-criteria sorting (date, title, relevance)
 */
export const calculateRelevanceScore = (
  title: string,
  content: string,
  tags: string[],
  searchQuery: string
): number => {
  if (!searchQuery || !searchQuery.trim()) {
    return 0;
  }

  const query = searchQuery.trim().toLowerCase();
  let score = 0;

  // Title matches are worth more
  const titleMatches = findSearchMatches(title.toLowerCase(), query, 'title');
  score += titleMatches.length * 10;

  // Exact title match gets bonus
  if (title.toLowerCase() === query) {
    score += 50;
  }

  // Title starts with query gets bonus
  if (title.toLowerCase().startsWith(query)) {
    score += 25;
  }

  // Content matches
  const contentMatches = findSearchMatches(content.toLowerCase(), query, 'content');
  score += contentMatches.length * 2;

  // Tag matches are worth more than content but less than title
  const tagMatches = tags.filter(tag => tag.toLowerCase().includes(query));
  score += tagMatches.length * 5;

  // Exact tag match gets bonus
  const exactTagMatch = tags.some(tag => tag.toLowerCase() === query);
  if (exactTagMatch) {
    score += 15;
  }

  return score;
};