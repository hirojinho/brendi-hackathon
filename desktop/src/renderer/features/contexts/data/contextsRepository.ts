import { contextsService, type Context as ContextData, type CreateContextRequest, type UpdateContextRequest } from '../../../services/contextsService';
import { Context } from '../domain/Context';
import { cacheManager } from '../../../shared/cache/Cache';

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
 * Implementation of ContextsRepository with caching
 */
class ContextsRepositoryImpl implements ContextsRepository {
  private cache = cacheManager.getCache<any>('contexts', { ttl: 10000 }); // 10 second cache (contexts change less frequently)

  async list(options?: { hierarchy?: boolean }): Promise<Context[]> {
    const cacheKey = `contexts:list:${options?.hierarchy ? 'hierarchy' : 'flat'}`;
    const cached = this.cache.get<Context[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const contexts = await contextsService.list(options);
    const domainContexts = contexts.map(Context.fromData);
    
    this.cache.set(cacheKey, domainContexts);
    return domainContexts;
  }

  async getChildren(parentId: string): Promise<Context[]> {
    const cacheKey = `contexts:children:${parentId}`;
    const cached = this.cache.get<Context[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const contexts = await contextsService.getChildren(parentId);
    const domainContexts = contexts.map(Context.fromData);
    
    this.cache.set(cacheKey, domainContexts);
    return domainContexts;
  }

  async create(request: CreateContextRequest): Promise<Context> {
    const context = await contextsService.create(request);
    const domainContext = Context.fromData(context);
    
    // Invalidate caches
    this.cache.invalidatePattern('contexts:*');
    
    return domainContext;
  }

  async update(request: UpdateContextRequest): Promise<Context> {
    const context = await contextsService.update(request);
    const domainContext = Context.fromData(context);
    
    // Invalidate caches
    this.cache.invalidatePattern('contexts:*');
    
    return domainContext;
  }

  async delete(id: string): Promise<void> {
    await contextsService.delete(id);
    
    // Invalidate caches
    this.cache.invalidatePattern('contexts:*');
  }
}

// Export singleton instance
export const contextsRepository: ContextsRepository = new ContextsRepositoryImpl();
