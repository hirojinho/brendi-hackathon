import { Note } from '../types';

// Configuration constants
export const REVIEW_CONFIG = {
  API_BASE_URL: 'http://localhost:3001',
  SCORE_THRESHOLD: 3, // Below this score triggers misconception note creation
} as const;

// Grading scale mapping
export const GRADE_MAPPING = {
  'EXCELLENT': 5,
  'GOOD': 4,
  'SATISFACTORY': 3,
  'POOR': 2,
  'INCORRECT': 1,
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

  ANSWER_EVALUATION: `You are a strict academic evaluator. Assess the student's answer using this 5-level grading scale:

**EXCELLENT (5/5):** Complete, accurate, demonstrates deep understanding
**GOOD (4/5):** Mostly correct with minor gaps, core concept understood  
**SATISFACTORY (3/5):** Partially correct, basic understanding but incomplete
**POOR (2/5):** Significant errors, some knowledge but fundamentally flawed
**INCORRECT (1/5):** Wrong answer or no understanding demonstrated

**Response Format:**
Start with exactly one of: "EXCELLENT:", "GOOD:", "SATISFACTORY:", "POOR:", or "INCORRECT:" followed by:
- **One sentence** explaining the grade
- **Key correction only** if incorrect (no full explanations)

**Examples:**
- "EXCELLENT: Demonstrates complete understanding with proper reasoning."
- "GOOD: Correct concept but missing the final step."
- "SATISFACTORY: Right idea but lacks precision in terminology."
- "POOR: Confuses fundamental concepts. Correct answer: [brief correction]"
- "INCORRECT: Wrong approach entirely. Answer: [correct answer only]"

**Be concise, objective, and strict.**`,

  FOLLOWUP_EVALUATION: `You are an educational content evaluator. Analyze this follow-up conversation from a spaced repetition review session and determine if it contains valuable content that should be saved as a note.

**Evaluation Criteria:**
- **Clarifies misconceptions**: Does the conversation reveal and address a misunderstanding?
- **Adds depth**: Does it provide deeper insight into the original concept?
- **Explains difficult concepts**: Does it break down complex ideas in a useful way?
- **Provides examples**: Does it give concrete examples or applications?
- **Reveals knowledge gaps**: Does it identify areas needing further study?

**Response Format:**
Start with exactly one of: "CREATE_NOTE:" or "SKIP:" followed by:
- Brief explanation of the decision (1-2 sentences)
- If CREATE_NOTE, suggest a concise title for the note (5-8 words)

**Examples:**
- CREATE_NOTE: This conversation clarifies a common misconception about derivatives. Suggested title: "Chain Rule vs Product Rule Differences"
- SKIP: This is just a simple clarification that doesn't add significant educational value.

**Be selective - only recommend note creation for genuinely valuable educational content.**`,
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
  modelName?: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  noteContent: string;
  currentQuestion: string;
  model: string;
  modelName?: string;
}

export interface MisconceptionNoteRequest {
  noteTitle: string;
  question: string;
  userAnswer: string;
  feedback: string;
  model: string;
  modelName?: string;
}

export interface FollowUpNoteRequest {
  noteTitle: string;
  originalQuestion: string;
  userQuestion: string;
  assistantResponse: string;
  model: string;
  modelName?: string;
}

export interface FollowUpEvaluationRequest {
  noteContent: string;
  originalQuestion: string;
  followUpConversation: ChatMessage[];
  model: string;
  modelName?: string;
}

// API service functions
export const reviewApiService = {
  // Generate a review question for a note
  async generateQuestion(noteContent: string, model: string, modelName?: string): Promise<string> {
    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: PROMPT_TEMPLATES.QUESTION_GENERATION + noteContent,
        history: [],
        model: model,
        modelName
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
    const { noteContent, question, userAnswer, model, modelName } = request;
    
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
        model,
        modelName
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
    const { message, history, currentQuestion, model, modelName } = request;
    
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
        model,
        modelName
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
    const { noteTitle, question, userAnswer, feedback, model, modelName } = request;
    
    const content = `Common Misconception: ${noteTitle}

Question: ${question}
Student's Answer: ${userAnswer}
Correct Answer: ${feedback.replace(/^(INCORRECT:|CORRECT:)/i, '').trim()}

This note captures a common misconception about ${noteTitle}. The student's answer reveals a misunderstanding that should be addressed.`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, model, modelName })
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

  // Evaluate follow-up conversation for note creation
  async evaluateFollowUpConversation(request: FollowUpEvaluationRequest): Promise<string> {
    const { noteContent, originalQuestion, followUpConversation, model, modelName } = request;
    
    // Format the conversation for evaluation
    const conversationText = followUpConversation
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    const message = `${PROMPT_TEMPLATES.FOLLOWUP_EVALUATION}

Original Note:
${noteContent}

Original Question: ${originalQuestion}

Follow-up Conversation:
${conversationText}`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: [],
        model,
        modelName
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to evaluate follow-up conversation');
    }

    const data = await response.json();
    return data.response;
  },

  // Create follow-up note
  async createFollowUpNote(request: FollowUpNoteRequest): Promise<Note | null> {
    const { noteTitle, originalQuestion, userQuestion, assistantResponse, model, modelName } = request;
    
    const content = `Follow-up Question: ${noteTitle}

Original Question: ${originalQuestion}
Student's Question: ${userQuestion}
Assistant's Response: ${assistantResponse}

This note captures a follow-up question that reveals potential misconceptions or areas needing clarification about ${noteTitle}.`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, model, modelName })
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
  // Determine score from feedback using the new 5-level grading system
  getScoreFromFeedback(feedback: string): number {
    const normalizedFeedback = feedback.toUpperCase();
    
    // Check for each grade level
    for (const [grade, score] of Object.entries(GRADE_MAPPING)) {
      if (normalizedFeedback.startsWith(`${grade}:`)) {
        return score;
      }
    }
    
    // Fallback for legacy responses that still use CORRECT/INCORRECT
    if (normalizedFeedback.startsWith('CORRECT:')) {
      return GRADE_MAPPING.GOOD; // Map old "CORRECT" to "GOOD" (4/5)
    }
    
    // Default to INCORRECT if no grade found
    return GRADE_MAPPING.INCORRECT;
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
  },

  // Parse follow-up evaluation response
  parseFollowUpEvaluation(evaluation: string): { shouldCreate: boolean; title?: string; reason: string } {
    const upperEvaluation = evaluation.toUpperCase();
    
    if (upperEvaluation.startsWith('CREATE_NOTE:')) {
      const content = evaluation.slice(12).trim(); // Remove "CREATE_NOTE:" prefix
      
      // Extract suggested title if present
      const titleMatch = content.match(/(?:title[:\s]+|suggested title[:\s]+)["']?([^"'\n]+)["']?/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;
      
      return {
        shouldCreate: true,
        title: title,
        reason: content.split('\n')[0] || content // First line as reason
      };
    } else if (upperEvaluation.startsWith('SKIP:')) {
      const reason = evaluation.slice(5).trim(); // Remove "SKIP:" prefix
      return {
        shouldCreate: false,
        reason: reason
      };
    } else {
      // Fallback parsing
      return {
        shouldCreate: false,
        reason: 'Could not parse evaluation response'
      };
    }
  },

  // Create enhanced follow-up note with conversation content
  async createEnhancedFollowUpNote(
    noteTitle: string,
    originalQuestion: string,
    followUpConversation: ChatMessage[],
    suggestedTitle?: string,
    model: string = 'ollama',
    modelName?: string
  ): Promise<Note | null> {
    const conversationText = followUpConversation
      .filter(msg => msg.role !== 'system')
      .map(msg => `**${msg.role === 'user' ? 'Student' : 'Assistant'}**: ${msg.content}`)
      .join('\n\n');
    
    const title = suggestedTitle || `Follow-up: ${noteTitle}`;
    
    const content = `# ${title}

## Original Context
**Original Question**: ${originalQuestion}

## Follow-up Conversation
${conversationText}

## Educational Value
This conversation provides additional insight and clarification related to the original concept, addressing student questions and potential misconceptions.

---
*Generated from review session follow-up conversation*`;

    const response = await fetch(`${REVIEW_CONFIG.API_BASE_URL}/api/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, model, modelName })
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