import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import {
  makeCreateContextHandler,
  makeListContextsHandler,
  makeGetContextHandler,
  makeGetContextChildrenHandler,
  makeUpdateContextHandler,
  makeDeleteContextHandler
} from '../controllers/contexts.controller.js';

export function registerContextsRoutes(app: Express, container: Container) {
  app.post('/api/contexts', makeCreateContextHandler(container));
  app.get('/api/contexts', makeListContextsHandler(container));
  app.get('/api/contexts/:id', makeGetContextHandler(container));
  app.get('/api/contexts/:parentId/children', makeGetContextChildrenHandler(container));
  app.patch('/api/contexts/:id', makeUpdateContextHandler(container));
  app.delete('/api/contexts/:id', makeDeleteContextHandler(container));
}

