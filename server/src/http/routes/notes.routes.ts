import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import {
  makeCreateNoteHandler,
  makeListNotesHandler,
  makeDeleteNoteHandler,
  makeUpdateNoteSrsHandler
} from '../controllers/notes.controller.js';

export function registerNotesRoutes(app: Express, container: Container) {
  app.post('/api/note', makeCreateNoteHandler(container));
  app.get('/api/notes', makeListNotesHandler(container));
  app.delete('/api/notes/:id', makeDeleteNoteHandler(container));
  app.patch('/api/notes/:id', makeUpdateNoteSrsHandler(container));
}


