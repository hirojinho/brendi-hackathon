import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import {
  makeCreatePermanentNoteHandler,
  makeTransformQuickNoteHandler,
  makeListPermanentNotesHandler,
  makeSearchPermanentNotesHandler,
  makeGetPermanentNoteHandler,
  makeUpdatePermanentNoteHandler,
  makeDeletePermanentNoteHandler
} from '../controllers/permanentNotes.controller.js';

export function registerPermanentNotesRoutes(app: Express, container: Container) {
  app.post('/api/permanent-notes', makeCreatePermanentNoteHandler(container));
  app.post('/api/permanent-notes/transform/:quickNoteId', makeTransformQuickNoteHandler(container));
  app.get('/api/permanent-notes', makeListPermanentNotesHandler(container));
  app.get('/api/permanent-notes/search', makeSearchPermanentNotesHandler(container));
  app.get('/api/permanent-notes/:id', makeGetPermanentNoteHandler(container));
  app.patch('/api/permanent-notes/:id', makeUpdatePermanentNoteHandler(container));
  app.delete('/api/permanent-notes/:id', makeDeletePermanentNoteHandler(container));
}