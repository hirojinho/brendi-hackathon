import { ContextRepository } from '../../domain/ports/repositories/index.js';
import { ContextEntity } from '../../domain/entities/index.js';

export interface ContextTreeNode extends ContextEntity {
  children?: ContextTreeNode[];
}

export class ContextsService {
  constructor(private readonly contextsRepo: ContextRepository) {}

  create(context: ContextEntity): void {
    // Prevent circular references
    if (context.parentId) {
      const parent = this.contextsRepo.getById(context.parentId);
      if (!parent) {
        throw new Error('Parent context not found');
      }
      // Check if parent is a descendant of this context (would create a cycle)
      if (this.isDescendant(context.id, context.parentId)) {
        throw new Error('Cannot create circular reference in context hierarchy');
      }
    }
    this.contextsRepo.save(context);
  }

  list(): ContextEntity[] {
    return this.contextsRepo.list();
  }

  getById(id: string): ContextEntity | null {
    return this.contextsRepo.getById(id);
  }

  getChildren(parentId: string): ContextEntity[] {
    return this.contextsRepo.getChildren(parentId);
  }

  getHierarchy(): ContextTreeNode[] {
    const allContexts = this.contextsRepo.list();
    const contextMap = new Map<string, ContextTreeNode>();
    
    // Create map of all contexts
    allContexts.forEach(ctx => {
      contextMap.set(ctx.id, { ...ctx, children: [] });
    });
    
    // Build tree structure
    const roots: ContextTreeNode[] = [];
    allContexts.forEach(ctx => {
      const node = contextMap.get(ctx.id)!;
      if (ctx.parentId && contextMap.has(ctx.parentId)) {
        const parent = contextMap.get(ctx.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  }

  private isDescendant(contextId: string, potentialAncestorId: string): boolean {
    const context = this.contextsRepo.getById(contextId);
    if (!context || !context.parentId) return false;
    if (context.parentId === potentialAncestorId) return true;
    return this.isDescendant(context.parentId, potentialAncestorId);
  }

  update(id: string, update: Partial<Omit<ContextEntity, 'id' | 'createdAt'>>): void {
    // Prevent circular references if parentId is being updated
    if (update.parentId !== undefined) {
      if (update.parentId) {
        const parent = this.contextsRepo.getById(update.parentId);
        if (!parent) {
          throw new Error('Parent context not found');
        }
        // Check if parent is a descendant of this context (would create a cycle)
        if (this.isDescendant(id, update.parentId)) {
          throw new Error('Cannot create circular reference in context hierarchy');
        }
      }
    }
    this.contextsRepo.update(id, update);
  }

  delete(id: string): void {
    // Check if context has children
    const children = this.contextsRepo.getChildren(id);
    if (children.length > 0) {
      throw new Error('Cannot delete context with children. Please delete or move children first.');
    }
    this.contextsRepo.delete(id);
  }
}

