import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../../shared/utils/errorHandler.js';
import { validateRequired, validateId } from '../../shared/utils/validation.js';
import { sendSuccess, sendError, sendNotFound } from '../../shared/utils/response.js';

export function makeCreateContextHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { name, description, parentId } = req.body || {};
    
    validateRequired(name, 'Name');

    const nowIso = new Date().toISOString();
    const context = {
      id: uuidv4(),
      name,
      description: description || '',
      parentId: parentId || null,
      createdAt: nowIso,
      lastModified: nowIso
    };

    container.services.contexts.create(context);
    return sendSuccess(res, { context });
  });
}

export function makeListContextsHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { hierarchy } = req.query;
    
    if (hierarchy === 'true') {
      const hierarchyTree = container.services.contexts.getHierarchy();
      return sendSuccess(res, { contexts: hierarchyTree });
    }
    
    const contexts = container.services.contexts.list();
    return sendSuccess(res, { contexts });
  });
}

export function makeGetContextChildrenHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const parentId = req.params.parentId;
    validateId(parentId, 'Parent ID');

    const children = container.services.contexts.getChildren(parentId);
    return sendSuccess(res, { contexts: children });
  });
}

export function makeGetContextHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Context ID');

    const context = container.services.contexts.getById(id);
    if (!context) {
      return sendNotFound(res, 'Context');
    }

    return sendSuccess(res, { context });
  });
}

export function makeUpdateContextHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const { name, description, parentId } = req.body || {};

    validateId(id, 'Context ID');

    const existing = container.services.contexts.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Context');
    }

    const update: any = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (parentId !== undefined) update.parentId = parentId || null;

    container.services.contexts.update(id, update);

    const updated = container.services.contexts.getById(id);
    return sendSuccess(res, { context: updated });
  });
}

export function makeDeleteContextHandler(container: Container) {
  return asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    validateId(id, 'Context ID');

    const existing = container.services.contexts.getById(id);
    if (!existing) {
      return sendNotFound(res, 'Context');
    }

    container.services.contexts.delete(id);
    return sendSuccess(res, { message: 'Context deleted successfully' });
  });
}
