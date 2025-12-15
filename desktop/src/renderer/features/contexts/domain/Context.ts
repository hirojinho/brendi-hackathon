import type { Context as ContextData } from '../../../services/contextsService';

/**
 * Domain model for Context
 * Represents a hierarchical context for organizing notes
 */
export class Context {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly parentId: string | null,
    public readonly createdAt: Date,
    public readonly lastModified: Date,
    public readonly children: readonly Context[] = []
  ) {}

  /**
   * Check if context is a root context (no parent)
   */
  isRoot(): boolean {
    return this.parentId === null;
  }

  /**
   * Check if context has children
   */
  hasChildren(): boolean {
    return this.children.length > 0;
  }

  /**
   * Check if context is a child of another context
   */
  isChildOf(parentId: string): boolean {
    return this.parentId === parentId;
  }

  /**
   * Get depth in hierarchy (0 for root)
   */
  getDepth(): number {
    if (this.isRoot()) return 0;
    // This would need parent context to calculate properly
    // For now, return 1 if has parent
    return this.parentId ? 1 : 0;
  }

  /**
   * Get full path (e.g., "Parent > Child > Grandchild")
   * Note: This requires the full context tree to be passed
   */
  getPath(contextMap: Map<string, Context>): string {
    const path: string[] = [this.name];
    let current: Context | undefined = this;
    
    while (current?.parentId) {
      current = contextMap.get(current.parentId);
      if (current) {
        path.unshift(current.name);
      } else {
        break;
      }
    }
    
    return path.join(' > ');
  }

  /**
   * Create from API data
   */
  static fromData(data: ContextData): Context {
    return new Context(
      data.id,
      data.name,
      data.description,
      data.parentId,
      new Date(data.createdAt),
      new Date(data.lastModified),
      data.children ? Object.freeze(data.children.map(Context.fromData)) : []
    );
  }

  /**
   * Convert to API data format
   */
  toData(): ContextData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      parentId: this.parentId,
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString(),
      children: this.children.map(child => child.toData()),
    };
  }
}
