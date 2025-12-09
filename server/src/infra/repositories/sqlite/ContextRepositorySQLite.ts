import { ContextRepository } from '../../../domain/ports/repositories/index.js';
import { ContextEntity } from '../../../domain/entities/index.js';
import ContextsDatabase from '../../db/contextsDatabase.js';

export class ContextRepositorySQLite implements ContextRepository {
  constructor(private readonly contextsDatabase: ContextsDatabase = new ContextsDatabase()) {}

  save(context: ContextEntity): void {
    this.contextsDatabase.saveContext({
      id: context.id,
      name: context.name,
      description: context.description,
      parentId: context.parentId || null,
      createdAt: new Date(context.createdAt),
      lastModified: new Date(context.lastModified)
    });
  }

  update(id: string, update: Partial<Omit<ContextEntity, 'id' | 'createdAt'>>): void {
    const existing = this.getById(id);
    if (!existing) return;
    
    const updated: ContextEntity = {
      ...existing,
      ...update,
      lastModified: new Date().toISOString()
    };
    this.save(updated);
  }

  list(): ContextEntity[] {
    return this.contextsDatabase.getAllContexts();
  }

  getById(id: string): ContextEntity | null {
    return this.contextsDatabase.getContext(id);
  }

  getChildren(parentId: string): ContextEntity[] {
    return this.contextsDatabase.getChildren(parentId);
  }

  delete(id: string): void {
    this.contextsDatabase.deleteContext(id);
  }
}

