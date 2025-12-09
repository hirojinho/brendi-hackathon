import type { Context } from '../services/contextsService';

/**
 * Finds a context by ID in a hierarchical context tree
 */
export function findContextById(
  contexts: Context[],
  contextId: string | null | undefined
): Context | null {
  if (!contextId) return null;

  for (const ctx of contexts) {
    if (ctx.id === contextId) return ctx;
    if (ctx.children) {
      const found = findContextById(ctx.children, contextId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Gets the display name of a context by ID
 */
export function getContextName(
  contexts: Context[],
  contextId: string | null | undefined
): string | null {
  const context = findContextById(contexts, contextId);
  return context?.name || null;
}

export interface ContextOption {
  id: string;
  name: string;
  displayName: string;
  depth: number;
}

/**
 * Returns context options data for a select dropdown with hierarchical indentation
 */
export function getContextOptions(
  contexts: Context[],
  depth: number = 0
): ContextOption[] {
  const options: ContextOption[] = [];

  contexts.forEach(ctx => {
    const indent = '  '.repeat(depth);
    const displayName = ctx.name.length > 30 
      ? ctx.name.substring(0, 27) + '...' 
      : ctx.name;
    
    options.push({
      id: ctx.id,
      name: ctx.name,
      displayName: `${indent}${displayName}`,
      depth
    });

    if (ctx.children && ctx.children.length > 0) {
      options.push(...getContextOptions(ctx.children, depth + 1));
    }
  });

  return options;
}

/**
 * Flattens a hierarchical context tree into a flat list with depth information
 */
export function flattenContexts(
  contexts: Context[],
  depth: number = 0
): Array<Context & { depth: number }> {
  const result: Array<Context & { depth: number }> = [];

  contexts.forEach(ctx => {
    result.push({ ...ctx, depth });
    if (ctx.children && ctx.children.length > 0) {
      result.push(...flattenContexts(ctx.children, depth + 1));
    }
  });

  return result;
}

/**
 * Counts notes for a context and all its children recursively
 */
export function countNotesForContext(
  contextId: string,
  contexts: Context[],
  notes: Array<{ contextId: string | null }>
): number {
  const context = findContextById(contexts, contextId);
  if (!context) return 0;

  let count = notes.filter(note => note.contextId === contextId).length;

  if (context.children) {
    context.children.forEach(child => {
      count += countNotesForContext(child.id, contexts, notes);
    });
  }

  return count;
}

