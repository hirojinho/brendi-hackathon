import { Express } from 'express';
import { Container } from '../../bootstrap/container.js';
import {
  makeGetReviewStatusHandler,
  makeCreateReviewSessionHandler,
  makeGetActiveReviewSessionHandler,
  makeProcessNoteInReviewHandler,
  makeCompleteReviewSessionHandler
} from '../controllers/review.controller.js';

export function registerReviewRoutes(app: Express, container: Container) {
  app.get('/api/review/status', makeGetReviewStatusHandler(container));
  app.post('/api/review/session', makeCreateReviewSessionHandler(container));
  app.get('/api/review/session/active', makeGetActiveReviewSessionHandler(container));
  app.post('/api/review/session/:sessionId/notes/:noteId/process', makeProcessNoteInReviewHandler(container));
  app.post('/api/review/session/:sessionId/complete', makeCompleteReviewSessionHandler(container));
}