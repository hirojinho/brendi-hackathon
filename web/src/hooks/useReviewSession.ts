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
  isEvaluatingFollowUp: boolean;
  currentQuestion: string | null;
  userAnswer: string;
  feedback: string | null;
  showFeedback: boolean;
  chatInput: string;
  chatHistory: ChatMessage[];
  error: string | null;
  followUpEvaluation: string | null;
  
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
  modelName: string | undefined,
  onNoteClick: (note: Note) => void,
  srsManager: SRSManager
): ReviewSessionHook => {
  // Core state
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isEvaluatingFollowUp, setIsEvaluatingFollowUp] = useState(false);
  
  // Question and answer state
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followUpEvaluation, setFollowUpEvaluation] = useState<string | null>(null);
  
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
      const question = await reviewApiService.generateQuestion(currentNote.content, model, modelName);
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
        model: model,
        modelName
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

      // Note: Automatic misconception note creation disabled
      // Notes are only created during follow-up conversations when LLM evaluates it as educationally valuable

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
        model: model,
        modelName
      });
      
      const assistantMessage: ChatMessage = { role: 'assistant', content: aiResponse };
      const fullConversation = [...newHistory, assistantMessage];
      setChatHistory(fullConversation);

      // Evaluate the follow-up conversation for note creation
      setIsEvaluatingFollowUp(true);
      setFollowUpEvaluation(null);
      
      try {
        // Get only the follow-up conversation (exclude initial answer feedback)
        const followUpConversation = fullConversation.filter(msg => 
          msg.role !== 'system' && 
          !msg.content.startsWith('Here is the question based on the note:') &&
          !msg.content.includes('EXCELLENT:') && 
          !msg.content.includes('GOOD:') && 
          !msg.content.includes('SATISFACTORY:') && 
          !msg.content.includes('POOR:') && 
          !msg.content.includes('INCORRECT:')
        );

        if (followUpConversation.length >= 2) { // At least one exchange
          const evaluation = await reviewApiService.evaluateFollowUpConversation({
            noteContent: currentNote.content,
            originalQuestion: currentQuestion,
            followUpConversation: followUpConversation,
            model: model,
            modelName
          });

          setFollowUpEvaluation(evaluation);
          
          // Parse the evaluation result
          const evalResult = reviewLogic.parseFollowUpEvaluation(evaluation);
          
          if (evalResult.shouldCreate) {
            // Create enhanced follow-up note with the full conversation
            const followUpNote = await reviewLogic.createEnhancedFollowUpNote(
              currentNote.title,
              currentQuestion,
              followUpConversation,
              evalResult.title,
              model,
              modelName
            );
            
            if (followUpNote) {
              onNoteClick(followUpNote);
              setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: `✅ **Note Created!** This conversation contains valuable insights, so I've saved it as a new note: "${followUpNote.title}"\n\n*${evalResult.reason}*` 
              }]);
            }
          } else {
            // Show evaluation feedback without creating note
            setChatHistory(prev => [...prev, { 
              role: 'assistant', 
              content: `💭 **Evaluation**: ${evalResult.reason}\n\n*This conversation wasn't saved as a note, but feel free to continue asking questions!*` 
            }]);
          }
        }
        
      } catch (error) {
        console.error('Failed to evaluate follow-up conversation:', error);
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: `ℹ️ *Note: I couldn't evaluate whether this conversation should be saved as a note, but you can continue asking questions.*` 
        }]);
      } finally {
        setIsEvaluatingFollowUp(false);
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
    setFollowUpEvaluation(null);
    setIsEvaluatingFollowUp(false);
    
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
    isEvaluatingFollowUp,
    currentQuestion,
    userAnswer,
    feedback,
    showFeedback,
    chatInput,
    chatHistory,
    error,
    followUpEvaluation,
    
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