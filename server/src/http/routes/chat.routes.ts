import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import { makeChatHandler } from '../controllers/chat.controller.js';

export function registerChatRoutes(app: Express, container: Container) {
  app.post('/api/chat', makeChatHandler(container));
}


