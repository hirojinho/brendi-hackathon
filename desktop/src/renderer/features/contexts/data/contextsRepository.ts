import { contextsService, type Context as ContextData, type CreateContextRequest, type UpdateContextRequest } from '../../../services/contextsService';
import { Context } from '../domain/Context';

/**
 * Repository interface for contexts data access
 */
export interface ContextsRepository {
  list(options?: { hierarchy?: boolean }): Promise<Context[]>;
  getChildren(parentId: string): Promise<Context[]>;
  create(request: CreateContextRequest): Promise<Context>;
  update(request: UpdateContextRequest): Promise<Context>;
  delete(id: string): Promise<void>;
}

/**
 * Implementation of ContextsRepository
 */
export class ContextsRepositoryImpl implements ContextsRepository {
  async list(options?: { hierarchy?: boolean }): Promise<Context[]> {
    const contexts = await contextsService.list(options);
    return contexts.map(Context.fromData);
  }

  async getChildren(parentId: string): Promise<Context[]> {
    const contexts = await contextsService.getChildren(parentId);
    return contexts.map(Context.fromData);
  }

  async create(request: CreateContextRequest): Promise<Context> {
    const context = await contextsService.create(request);
    return Context.fromData(context);
  }

  async update(request: UpdateContextRequest): Promise<Context> {
    const context = await contextsService.update(request);
    return Context.fromData(context);
  }

  async delete(id: string): Promise<void> {
    await contextsService.delete(id);
  }
}

// Export singleton instance
export const contextsRepository: ContextsRepository = new ContextsRepositoryImpl();
