import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import {
  makeCreateQuickNoteHandler,
  makeListQuickNotesHandler,
  makeGetQuickNoteHandler,
  makeUpdateQuickNoteHandler,
  makeDeleteQuickNoteHandler,
  makeGetQuickNotesStatusHandler
} from '../controllers/quickNotes.controller.js';

export function registerQuickNotesRoutes(app: Express, container: Container) {
  app.post('/api/quick-notes', makeCreateQuickNoteHandler(container));
  app.get('/api/quick-notes', makeListQuickNotesHandler(container));
  app.get('/api/quick-notes/status', makeGetQuickNotesStatusHandler(container));
  app.get('/api/quick-notes/:id', makeGetQuickNoteHandler(container));
  app.patch('/api/quick-notes/:id', makeUpdateQuickNoteHandler(container));
  app.delete('/api/quick-notes/:id', makeDeleteQuickNoteHandler(container));
}

