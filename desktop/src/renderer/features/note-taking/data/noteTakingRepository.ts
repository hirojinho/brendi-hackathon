import { noteTakingAgentService, type ProcessNoteTakingInputRequest, type ProcessNoteTakingInputResponse } from '../../../services/noteTakingAgentService';
import { NoteTakingResult } from '../domain/NoteTakingResult';
import type { ModelType } from '../../../types/chat';

/**
 * Repository interface for note-taking agent data access
 */
export interface NoteTakingRepository {
  processInput(
    input: string,
    model: ModelType,
    modelName?: string,
    currentContextId?: string
  ): Promise<NoteTakingResult>;
}

/**
 * Implementation of NoteTakingRepository
 */
export class NoteTakingRepositoryImpl implements NoteTakingRepository {
  async processInput(
    input: string,
    model: ModelType,
    modelName?: string,
    currentContextId?: string
  ): Promise<NoteTakingResult> {
    const request: ProcessNoteTakingInputRequest = {
      input,
      model,
      modelName,
      currentContextId,
    };

    const response = await noteTakingAgentService.processInput(request);
    return NoteTakingResult.fromData(response);
  }
}

// Export singleton instance
export const noteTakingRepository: NoteTakingRepository = new NoteTakingRepositoryImpl();
