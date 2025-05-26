import { useState } from 'react';
import { Note } from '../types';
import { SRSManager } from '../utils/srs';
import { 
  reviewApiService, 
  reviewLogic, 
  ChatMessage
} from '../services/reviewService';

export interface ReviewSessionHook {
  // State
  isLoading: boolean;
  isReviewing: boolean;
  isChatLoading: boolean;
  isChatting: boolean;
  currentQuestion: string | null;
  userAnswer: string;
  feedback: string | null;
  showFeedback: boolean;
  chatInput: string;
  chatHistory: ChatMessage[];
  error: string | null;
  
  // Actions
  startReview: () => Promise<void>;
  submitAnswer: () => Promise<void>;
  sendChatMessage: () => Promise<void>;
  skipCurrentNote: () => void;
  showChatInterface: () => void;
  proceedToNext: () => Promise<void>;
  
  // Setters
  setUserAnswer: (answer: string) => void;
  setChatInput: (input: string) => void;
}

export const useReviewSession = (
  notes: Note[],
  model: string,
  onNoteClick: (note: Note) => void,
  srsManager: SRSManager
): ReviewSessionHook => {
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  
  // Question and answer state
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Helper function to get current note
  const getCurrentNote = () => {
    const currentState = srsManager.getCurrentNote();
    if (!currentState) return null;
    return notes.find(n => n.id === currentState.noteId) || null;
  };

  // Generate a new question for the current note
  const generateQuestion = async (): Promise<void> => {
    const currentNote = getCurrentNote();
    if (!currentNote) {
      setIsReviewing(false);
      setFeedback("Review session completed!");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const question = await reviewApiService.generateQuestion(currentNote.content, model);
      setCurrentQuestion(question);
      setUserAnswer('');
    } catch (error) {
      console.error('Error generating question:', error);
      const errorMessage = 'Failed to generate question. Please try again.';
      setFeedback(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new review session
  const startReview = async (): Promise<void> => {
    const session = srsManager.startReviewSession(notes);
    if (session.notes.length === 0) {
      setFeedback("No notes are due for review at this time.");
      return;
    }
    
    setIsReviewing(true);
    setFeedback(null);
    setError(null);
    await generateQuestion();
  };

  // Submit user's answer for evaluation
  const submitAnswer = async (): Promise<void> => {
    if (!userAnswer.trim()) return;
    
    const currentNote = getCurrentNote();
    if (!currentNote || !currentQuestion) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Get feedback from AI
      const feedback = await reviewApiService.evaluateAnswer({
        noteContent: currentNote.content,
        question: currentQuestion,
        userAnswer: userAnswer,
        model: model
      });
      
      setFeedback(feedback);
      
      // Calculate score and update SRS
      const score = reviewLogic.getScoreFromFeedback(feedback);
      const newState = srsManager.updateReviewPerformance(score);
      
      // Update database with new SRS state
      if (newState) {
        try {
          await reviewApiService.updateNoteSRS(currentNote.id, newState);
        } catch (error) {
          setError('Failed to update note in database. Review progress may not be saved.');
          console.error('Database update error:', error);
        }
      }

      // Create misconception note if answer was incorrect
      if (reviewLogic.shouldCreateMisconceptionNote(score)) {
        try {
          const misconceptionNote = await reviewApiService.createMisconceptionNote({
            noteTitle: currentNote.title,
            question: currentQuestion,
            userAnswer: userAnswer,
            feedback: feedback
          });
          
          if (misconceptionNote) {
            onNoteClick(misconceptionNote);
            setChatHistory(prev => [...prev, { 
              role: 'assistant', 
              content: `I've created a new note about this misconception:\n\n${misconceptionNote.content}` 
            }]);
          }
        } catch (error) {
          console.error('Failed to create misconception note:', error);
        }
      }

      // Set up initial chat history
      const systemMessage = reviewLogic.createSystemMessage(currentNote.content);
      setChatHistory([
        systemMessage,
        { role: 'assistant', content: `Here is the question based on the note:\n\n${currentQuestion}` },
        { role: 'user', content: userAnswer },
        { role: 'assistant', content: feedback }
      ]);
      
      setIsChatting(true);
      setShowFeedback(true);
      
    } catch (error) {
      console.error('Error in submitAnswer:', error);
      const errorMessage = 'Failed to analyze answer. Please try again.';
      setFeedback(errorMessage);
      setError(errorMessage);
      setShowFeedback(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a chat message for follow-up questions
  const sendChatMessage = async (): Promise<void> => {
    if (!chatInput.trim() || !currentQuestion) return;
    
    const currentNote = getCurrentNote();
    if (!currentNote) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setIsChatLoading(true);
    setChatInput('');
    
    try {
      const aiResponse = await reviewApiService.sendChatMessage({
        message: chatInput,
        history: newHistory,
        noteContent: currentNote.content,
        currentQuestion: currentQuestion,
        model: model
      });
      
      const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponse };
      setChatHistory([...newHistory, assistantMessage]);

      // Create follow-up note
      try {
        const followUpNote = await reviewApiService.createFollowUpNote({
          noteTitle: currentNote.title,
          originalQuestion: currentQuestion,
          userQuestion: chatInput,
          assistantResponse: aiResponse
        });
        
        if (followUpNote) {
          onNoteClick(followUpNote);
          setChatHistory(prev => [...prev, { 
            role: 'assistant', 
            content: `I've created a new note about this follow-up question:\n\n${followUpNote.content}` 
          }]);
        }
      } catch (error) {
        console.error('Failed to create follow-up note:', error);
      }
      
    } catch (error) {
      console.error('Error in sendChatMessage:', error);
      setChatHistory([...newHistory, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Skip the current note
  const skipCurrentNote = (): void => {
    srsManager.skipCurrentNote();
    generateQuestion();
  };

  // Show chat interface
  const showChatInterface = (): void => {
    setIsChatting(true);
  };

  // Proceed to next note
  const proceedToNext = async (): Promise<void> => {
    setShowFeedback(false);
    setFeedback(null);
    setUserAnswer('');
    setIsChatting(false);
    setChatHistory([]);
    
    const hasNext = srsManager.moveToNextNote();
    if (hasNext) {
      await generateQuestion();
    } else {
      setIsReviewing(false);
      setFeedback('Review session completed!');
    }
  };

  return {
    // State
    isLoading,
    isReviewing,
    isChatLoading,
    isChatting,
    currentQuestion,
    userAnswer,
    feedback,
    showFeedback,
    chatInput,
    chatHistory,
    error,
    
    // Actions
    startReview,
    submitAnswer,
    sendChatMessage,
    skipCurrentNote,
    showChatInterface,
    proceedToNext,
    
    // Setters
    setUserAnswer,
    setChatInput,
  };
}; 