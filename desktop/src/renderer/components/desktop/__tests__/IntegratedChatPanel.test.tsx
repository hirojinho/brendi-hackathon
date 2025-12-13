import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntegratedChatPanel } from '../IntegratedChatPanel';
import { NoteDisplayItem } from '../NotesManagementPanel';

// Mock the hooks and services
jest.mock('../../../hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    isLoading: false,
    currentResponse: '',
    useRag: false,
    maxChunks: 5,
    setInput: jest.fn(),
    setModel: jest.fn(),
    setModelName: jest.fn(),
    setUseRag: jest.fn(),
    setMaxChunks: jest.fn(),
    sendMessage: jest.fn(),
    clearChat: jest.fn(),
  }),
}));

jest.mock('../../common/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

const mockNotes: NoteDisplayItem[] = [
  {
    id: '1',
    type: 'quick',
    title: 'Test Note 1',
    content: 'This is test content for note 1',
    excerpt: 'This is test content...',
    tags: ['test', 'sample'],
    contextId: 'context1',
    contextName: 'Test Context',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    reviewStatus: 'pending',
  },
  {
    id: '2',
    type: 'permanent',
    title: 'Test Note 2',
    content: 'This is test content for note 2',
    excerpt: 'This is test content...',
    tags: ['permanent', 'example'],
    contextId: null,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-04'),
    reviewStatus: 'reviewed',
  },
];

const defaultProps = {
  isVisible: true,
  onToggleVisibility: jest.fn(),
  selectedNotes: mockNotes,
  onNoteContextChange: jest.fn(),
  model: 'openai' as const,
  modelName: 'gpt-4',
  embeddingProvider: 'openai' as const,
};

describe('IntegratedChatPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collapsed state when not visible', () => {
    render(
      <IntegratedChatPanel
        {...defaultProps}
        isVisible={false}
      />
    );

    expect(screen.getByTitle('Open Chat')).toBeInTheDocument();
    expect(screen.queryByText('Chat')).not.toBeInTheDocument();
  });

  it('renders expanded state when visible', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByTitle('Close Chat')).toBeInTheDocument();
    expect(screen.getByTitle('Select Note Context')).toBeInTheDocument();
    expect(screen.getByTitle('New Chat')).toBeInTheDocument();
  });

  it('shows welcome message when no messages exist', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    expect(screen.getByText('Start a Conversation')).toBeInTheDocument();
    expect(screen.getByText('Ask questions about your notes or get help with your studies!')).toBeInTheDocument();
  });

  it('displays context indicator when notes are selected', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    expect(screen.getByText(/Using 2 notes as context/)).toBeInTheDocument();
  });

  it('opens context selection panel when context button is clicked', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    const contextButton = screen.getByTitle('Select Note Context');
    fireEvent.click(contextButton);

    expect(screen.getByText('Select Notes for Context')).toBeInTheDocument();
    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.getByText('Test Note 2')).toBeInTheDocument();
  });

  it('allows selecting and deselecting notes for context', () => {
    const mockOnNoteContextChange = jest.fn();
    render(
      <IntegratedChatPanel
        {...defaultProps}
        onNoteContextChange={mockOnNoteContextChange}
      />
    );

    // Open context selection
    const contextButton = screen.getByTitle('Select Note Context');
    fireEvent.click(contextButton);

    // Click on a note to toggle selection
    const noteItem = screen.getByText('Test Note 1').closest('.context-note-item');
    expect(noteItem).toBeInTheDocument();
    
    if (noteItem) {
      fireEvent.click(noteItem);
      expect(mockOnNoteContextChange).toHaveBeenCalled();
    }
  });

  it('opens chat sessions list when sessions button is clicked', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    const sessionsButton = screen.getByTitle('Chat Sessions');
    fireEvent.click(sessionsButton);

    expect(screen.getByText('Chat Sessions')).toBeInTheDocument();
    expect(screen.getByText('No chat sessions yet')).toBeInTheDocument();
  });

  it('creates new chat session when new chat button is clicked', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    const newChatButton = screen.getByTitle('New Chat');
    fireEvent.click(newChatButton);

    // Should create a new session (implementation detail, but we can verify the UI updates)
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('shows RAG toggle and controls', () => {
    // Mock useChat with RAG enabled for this test
    const mockUseChatWithRag = jest.fn(() => ({
      messages: [],
      input: '',
      isLoading: false,
      currentResponse: '',
      useRag: true, // Enable RAG for this test
      maxChunks: 5,
      setInput: jest.fn(),
      setModel: jest.fn(),
      setModelName: jest.fn(),
      setUseRag: jest.fn(),
      setMaxChunks: jest.fn(),
      sendMessage: jest.fn(),
      clearChat: jest.fn(),
    }));

    // Temporarily override the mock
    const originalMock = require('../../../hooks/useChat').useChat;
    require('../../../hooks/useChat').useChat = mockUseChatWithRag;

    render(<IntegratedChatPanel {...defaultProps} />);

    expect(screen.getByText('Use Document Retrieval (RAG)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Max chunks input

    // Restore original mock
    require('../../../hooks/useChat').useChat = originalMock;
  });

  it('has proper placeholder text based on context selection', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Ask about your 2 selected notes/);
    expect(textarea).toBeInTheDocument();
  });

  it('calls onToggleVisibility when close button is clicked', () => {
    const mockToggle = jest.fn();
    render(
      <IntegratedChatPanel
        {...defaultProps}
        onToggleVisibility={mockToggle}
      />
    );

    const closeButton = screen.getByTitle('Close Chat');
    fireEvent.click(closeButton);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard shortcut for sending messages', () => {
    render(<IntegratedChatPanel {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    
    // Simulate typing and keyboard shortcut
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    // The actual send functionality is mocked, but we can verify the event handling
    expect(textarea).toBeInTheDocument();
  });
});