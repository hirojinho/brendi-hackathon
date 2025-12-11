import { Express } from 'express';
import { Container } from '../bootstrap/container.js';
import { registerChatRoutes } from './routes/chat.routes.js';
import { registerDocumentsRoutes } from './routes/documents.routes.js';
import { registerNotesRoutes } from './routes/notes.routes.js';
import { registerQuickNotesRoutes } from './routes/quickNotes.routes.js';
import { registerPermanentNotesRoutes } from './routes/permanentNotes.routes.js';
import { registerContextsRoutes } from './routes/contexts.routes.js';
import { registerReviewRoutes } from './routes/review.routes.js';

export function registerAllRoutes(app: Express, container: Container) {
  registerChatRoutes(app, container);
  registerDocumentsRoutes(app, container);
  registerNotesRoutes(app, container);
  registerQuickNotesRoutes(app, container);
  registerPermanentNotesRoutes(app, container);
  registerContextsRoutes(app, container);
  registerReviewRoutes(app, container);
}


