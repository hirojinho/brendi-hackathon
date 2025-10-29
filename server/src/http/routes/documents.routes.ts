import { Express } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Container } from '../../bootstrap/container.js';
import {
  makeUploadHandler,
  makeGetUploadStatusHandler,
  makeListDocumentsHandler,
  makeDeleteDocumentHandler,
  makeDocumentUsageHandler
} from '../controllers/documents.controller.js';

export function registerDocumentsRoutes(app: Express, container: Container) {
  const uploadDir = container.config.uploadsDir;
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({ dest: uploadDir });

  app.options('/api/documents/upload');
  app.post('/api/documents/upload', upload.single('file'), makeUploadHandler(container));
  app.get('/api/documents/upload-status/:uploadId', makeGetUploadStatusHandler());
  app.get('/api/documents', makeListDocumentsHandler(container));
  app.delete('/api/documents/:id', makeDeleteDocumentHandler(container));
  app.get('/api/documents/:id/usage', makeDocumentUsageHandler(container));
}


