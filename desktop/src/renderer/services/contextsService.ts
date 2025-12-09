export interface Context {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: string;
  lastModified: string;
  children?: Context[];
}

export interface CreateContextRequest {
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdateContextRequest {
  id: string;
  name?: string;
  description?: string;
  parentId?: string | null;
}

export class ContextsService {
  async list(options?: { hierarchy?: boolean }): Promise<Context[]> {
    try {
      const result = await window.electronAPI.listContexts(options);
      return result.contexts;
    } catch (error: any) {
      throw new Error(`Failed to list contexts: ${error.message || 'Unknown error'}`);
    }
  }

  async getChildren(parentId: string): Promise<Context[]> {
    try {
      const result = await window.electronAPI.getContextChildren(parentId);
      return result.contexts;
    } catch (error: any) {
      throw new Error(`Failed to get context children: ${error.message || 'Unknown error'}`);
    }
  }

  async create(request: CreateContextRequest): Promise<Context> {
    try {
      const result = await window.electronAPI.createContext(request);
      return result.context;
    } catch (error: any) {
      throw new Error(`Failed to create context: ${error.message || 'Unknown error'}`);
    }
  }

  async update(request: UpdateContextRequest): Promise<Context> {
    try {
      const result = await window.electronAPI.updateContext(request);
      return result.context;
    } catch (error: any) {
      throw new Error(`Failed to update context: ${error.message || 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await window.electronAPI.deleteContext(id);
    } catch (error: any) {
      throw new Error(`Failed to delete context: ${error.message || 'Unknown error'}`);
    }
  }
}

export const contextsService = new ContextsService();

