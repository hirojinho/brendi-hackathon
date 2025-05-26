import { Note } from '../types';

// Configuration constants
export const REVIEW_CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  CORRECT_SCORE: 5,
  INCORRECT_SCORE: 1,
  SCORE_THRESHOLD: 3,
} as const;

// Prompt templates
export const PROMPT_TEMPLATES = {
  STUDY_ASSISTANT_RULES: `You are a helpful study assistant. Your role is to:
1. Help students understand complex concepts
2. Provide clear and concise explanations
3. Use examples and analogies when helpful
4. Break down complex topics into simpler parts
5. Check for understanding
6. Be encouraging and supportive
7. Maintain context of the conversation
8. Use Markdown for formatting:
   - **bold** for emphasis
   - *italic* for secondary emphasis
   - \`code\` for technical terms
   - Lists with - or 1. 2. 3.
9. Use LaTeX for mathematical expressions:
   - Inline math: $...$ (e.g., $E = mc^2$)
   - Block math: $$...$$ (e.g., $$\\frac{d}{dx}f(x) = \\lim_{h \\to 0}\\frac{f(x+h) - f(x)}{h}$$)
   - Use \\frac for fractions
   - Use \\sum for summations
   - Use \\int for integrals
   - Use \\lim for limits
   - Use subscripts with _ and superscripts with ^
10. Do NOT use HTML tags`,

  QUESTION_GENERATION: `You are a review question generation assistant. Your job is to create a single, objective, atomic review question that reinforces the principal concept of the following Zettelkasten note. The question must:

- Focus on one fundamental concept (atomicity)
- Be clear, direct, and unambiguous
- Avoid trivia, superficial details, or multi-part questions
- Prompt recall or understanding of the core idea, not rote memorization
- Not be yes/no or true/false
- Not reference the note or its title directly; the question should stand alone
- Use simple, precise language
- If the note contains a mathematical concept, you may ask for the meaning, derivation, or application of a formula, but do not ask for verbatim reproduction

Return ONLY the question as a single string, with no explanation or extra text.

Note:
`,

  ANSWER_EVALUATION: `Review the student's answer to the flashcard question below. Your feedback should:
- Start with "CORRECT:" or "INCORRECT:" followed by your feedback
- Be brief and to the point
- If incorrect, state the correct answer concisely
- Avoid unnecessary explanation
- Use Markdown and LaTeX as needed`,
} as const;

// Type definitions
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AnswerEvaluationRequest {
  noteContent: string;
  question: string;
  userAnswer: string;
  model: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  noteContent: string;
  currentQuestion: string;
  model: string;
}

export interface MisconceptionNoteRequest {
  noteTitle: string;
  question: string;
  userAnswer: string;
  feedback: string;
}

export interface FollowUpNoteRequest {
  noteTitle: string;
  originalQuestion: string;
  userQuestion: string;
  assistantResponse: string;
}

// API service functions
export const reviewApiService = {
  // Generate a review question for a note
  async generateQuestion(noteContent: string, model: string): Promise<string> {
    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: PROMPT_TEMPLATES.QUESTION_GENERATION + noteContent,
        history: [],
        model: model
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate question');
    }

    const data = await response.json();
    return data.response;
  },

  // Evaluate student's answer
  async evaluateAnswer(request: AnswerEvaluationRequest): Promise<string> {
    const { noteContent, question, userAnswer, model } = request;
    
    const message = `${PROMPT_TEMPLATES.ANSWER_EVALUATION}

Note:
${noteContent}

Question: ${question}
Student's Answer: ${userAnswer}`;

    const history = [
      { 
        role: 'system' as const,
        content: `You are a study assistant. You are discussing the following note in a spaced repetition/flashcard context:\n\n${noteContent}\n\nKeep your answers atomic and concise. Use Markdown and LaTeX as needed. Do NOT use HTML tags.`
      },
      { role: 'assistant' as const, content: `Here is the question based on the note:\n\n${question}` },
      { role: 'user' as const, content: userAnswer }
    ];

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        model
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze answer');
    }

    const data = await response.json();
    return data.response;
  },

  // Handle follow-up chat
  async sendChatMessage(request: ChatRequest): Promise<string> {
    const { message, history, currentQuestion, model } = request;
    
    const chatMessage = `${PROMPT_TEMPLATES.STUDY_ASSISTANT_RULES}

Current question: ${currentQuestion}

${message}`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: chatMessage,
        history: history.map(m => ({ 
          role: m.role, 
          content: m.content 
        })),
        model
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    return data.response;
  },

  // Update note SRS state in database
  async updateNoteSRS(noteId: string, srsState: any): Promise<void> {
    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nextReview: srsState.nextReview,
        interval: srsState.interval,
        easiness: srsState.easiness,
        repetitions: srsState.repetitions,
        lastReview: srsState.lastReview,
        lastPerformance: srsState.lastPerformance
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update note in database');
    }
  },

  // Create misconception note
  async createMisconceptionNote(request: MisconceptionNoteRequest): Promise<Note | null> {
    const { noteTitle, question, userAnswer, feedback } = request;
    
    const content = `Common Misconception: ${noteTitle}

Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${feedback.replace(/^(INCORRECT:|CORRECT:)/i, '').trim()}

This note captures a common misconception about ${noteTitle}. The student's answer reveals a misunderstanding that should be addressed.`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      return null;
    }

    const noteData = await response.json();
    if (noteData.notes && Array.isArray(noteData.notes) && noteData.notes.length > 0) {
      return noteData.notes[0];
    }

    return null;
  },

  // Create follow-up note
  async createFollowUpNote(request: FollowUpNoteRequest): Promise<Note | null> {
    const { noteTitle, originalQuestion, userQuestion, assistantResponse } = request;
    
    const content = `Follow-up Question: ${noteTitle}

Original Question: ${originalQuestion}
Student's Question: ${userQuestion}
Assistant's Response: ${assistantResponse}

This note captures a follow-up question that reveals potential misconceptions or areas needing clarification about ${noteTitle}.`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      return null;
    }

    const noteData = await response.json();
    if (noteData.notes && Array.isArray(noteData.notes) && noteData.notes.length > 0) {
      return noteData.notes[0];
    }

    return null;
  }
};

// Business logic functions
export const reviewLogic = {
  // Determine score from feedback
  getScoreFromFeedback(feedback: string): number {
    return feedback.toLowerCase().startsWith('correct:') 
      ? REVIEW_CONFIG.CORRECT_SCORE 
      : REVIEW_CONFIG.INCORRECT_SCORE;
  },

  // Check if answer is incorrect and needs misconception note
  shouldCreateMisconceptionNote(score: number): boolean {
    return score < REVIEW_CONFIG.SCORE_THRESHOLD;
  },

  // Create system message for chat history
  createSystemMessage(noteContent: string): ChatMessage {
    return {
      role: 'system',
      content: `You are a study assistant. You are discussing the following note in a spaced repetition/flashcard context:\n\n${noteContent}\n\nKeep your answers atomic and concise. Use Markdown and LaTeX as needed. Do NOT use HTML tags.`
    };
  }
}; 