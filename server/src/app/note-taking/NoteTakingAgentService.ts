import { Container } from '../../bootstrap/container.js';
import { buildNoteTakingAgentPromptWithContext } from '../../domain/prompts/note-taking-agent-with-context.js';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../../shared/utils/errorHandler.js';

export interface NoteTakingAgentRequest {
  input: string;
  model: 'openai' | 'openrouter' | 'ollama';
  modelName?: string;
  currentContextId?: string;
}

export interface NoteTakingAgentResponse {
  shouldCreateNote: boolean;
  contextId: string | null;
  suggestedContext?: {
    name: string;
    description?: string;
    parentId?: string | null;
  } | null;
  reasoning: string;
  notes: Array<{
    id: string;
    title: string;
    content: string;
    tags: string[];
  }>;
  createdNoteIds: string[];
}

export class NoteTakingAgentService {
  constructor(private container: Container) {}

  async processInput(request: NoteTakingAgentRequest): Promise<NoteTakingAgentResponse> {
    const { input, model, modelName, currentContextId } = request;

    // Validate input
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      throw new ValidationError('Input is required and must be a non-empty string');
    }

    // Get all available contexts
    const allContexts = this.container.services.contexts.list();
    const contextData = allContexts.map(ctx => ({
      id: ctx.id,
      name: ctx.name,
      description: ctx.description,
      parentId: ctx.parentId || null
    }));

    // Build context-aware prompt
    const prompt = buildNoteTakingAgentPromptWithContext(input, contextData);

    // Select provider
    const selectedProvider = this.selectProvider(model);

    // Validate provider configuration
    this.validateProviderConfig(model);

    // Call LLM
    const providerResponse = await selectedProvider.generateResponse(prompt, [], modelName);
    const cleanedResponse = providerResponse.replace(/```json|```/g, '').trim();

    // Parse agent decision
    const agentDecision = this.parseAgentResponse(cleanedResponse);

    // Enhance with related notes if context is identified
    if (agentDecision.contextId && agentDecision.contextId !== 'new' && agentDecision.contextId !== null) {
      await this.enhanceWithRelatedNotes(agentDecision, input, contextData, selectedProvider, modelName);
    }

    // Create notes if agent decided to
    const createdNoteIds = await this.createNotesIfNeeded(agentDecision);

    // Build response
    return {
      shouldCreateNote: agentDecision.shouldCreateNote,
      contextId: agentDecision.contextId && agentDecision.contextId !== 'new' 
        ? agentDecision.contextId 
        : null,
      suggestedContext: agentDecision.contextId === 'new' 
        ? {
            name: agentDecision.suggestedContextName || '',
            description: agentDecision.suggestedContextDescription,
            parentId: agentDecision.suggestedParentContextId || null
          }
        : null,
      reasoning: agentDecision.reasoning,
      notes: agentDecision.notes.map((note, idx) => ({
        ...note,
        id: createdNoteIds[idx] || note.id
      })),
      createdNoteIds
    };
  }

  private selectProvider(model: string) {
    const provider = 
      model === 'openrouter' ? this.container.providers.llm.openrouter :
      model === 'ollama' ? this.container.providers.llm.ollama :
      this.container.providers.llm.openai;

    if (!provider) {
      throw new ValidationError(`Provider ${model} is not available`);
    }

    return provider;
  }

  private validateProviderConfig(model: string): void {
    if (model === 'openai') {
      const hasKey = !!(process.env.OPENAI_API_KEY || this.container.config.openaiApiKey);
      if (!hasKey) {
        throw new ValidationError('OpenAI API key is not configured');
      }
    } else if (model === 'openrouter') {
      const hasKey = !!(process.env.OPENROUTER_API_KEY || this.container.config.openrouterApiKey);
      if (!hasKey) {
        throw new ValidationError('OpenRouter API key is not configured');
      }
    }
    // Ollama doesn't require API key, just URL
  }

  private parseAgentResponse(cleanedResponse: string): {
    shouldCreateNote: boolean;
    contextId: string | null;
    suggestedContextName?: string;
    suggestedContextDescription?: string;
    suggestedParentContextId?: string | null;
    reasoning: string;
    notes: any[];
  } {
    try {
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        shouldCreateNote: Boolean(parsed.shouldCreateNote),
        contextId: parsed.contextId || null,
        suggestedContextName: parsed.suggestedContextName,
        suggestedContextDescription: parsed.suggestedContextDescription,
        suggestedParentContextId: parsed.suggestedParentContextId || null,
        reasoning: parsed.reasoning || 'No reasoning provided',
        notes: Array.isArray(parsed.notes) 
          ? parsed.notes.filter((candidate: any) => 
              candidate && candidate.title && candidate.content && Array.isArray(candidate.tags)
            )
          : []
      };
    } catch (parseError: any) {
      throw new ValidationError(`Failed to parse agent response: ${parseError.message}`);
    }
  }

  private async enhanceWithRelatedNotes(
    agentDecision: any,
    input: string,
    contextData: Array<{ id: string; name: string; description: string; parentId: string | null }>,
    provider: any,
    modelName?: string
  ): Promise<void> {
    const relatedNotes = this.container.services.quickNotes.getByContext(agentDecision.contextId);
    
    if (relatedNotes.length > 0 && agentDecision.shouldCreateNote) {
      const enhancedPrompt = buildNoteTakingAgentPromptWithContext(
        input,
        contextData,
        relatedNotes.slice(0, 5).map(note => ({
          title: note.title,
          content: note.content,
          tags: note.tags
        }))
      );

      try {
        const enhancedResponse = await provider.generateResponse(enhancedPrompt, [], modelName);
        const enhancedCleaned = enhancedResponse.replace(/```json|```/g, '').trim();
        const enhancedParsed = JSON.parse(enhancedCleaned);

        if (enhancedParsed.shouldCreateNote && Array.isArray(enhancedParsed.notes) && enhancedParsed.notes.length > 0) {
          agentDecision.notes = enhancedParsed.notes.filter((candidate: any) =>
            candidate && candidate.title && candidate.content && Array.isArray(candidate.tags)
          );
          agentDecision.reasoning = enhancedParsed.reasoning || agentDecision.reasoning;
        }
      } catch (e) {
        // If enhancement fails, continue with original decision
        console.warn('[NoteTakingAgent] Failed to enhance with related notes:', e);
      }
    }
  }

  private async createNotesIfNeeded(agentDecision: any): Promise<string[]> {
    const createdNoteIds: string[] = [];

    if (agentDecision.shouldCreateNote && agentDecision.notes.length > 0) {
      const nowIso = new Date().toISOString();
      const finalContextId = agentDecision.contextId && agentDecision.contextId !== 'new' 
        ? agentDecision.contextId 
        : null;

      for (const note of agentDecision.notes) {
        try {
          const noteId = uuidv4();
          this.container.services.quickNotes.create({
            id: noteId,
            title: note.title,
            content: note.content,
            tags: note.tags,
            contextId: finalContextId,
            createdAt: nowIso,
            lastModified: nowIso
          });
          createdNoteIds.push(noteId);
        } catch (noteError: any) {
          throw new Error(`Failed to save quick note: ${noteError?.message || 'Unknown error'}`);
        }
      }
    }

    return createdNoteIds;
  }
}

