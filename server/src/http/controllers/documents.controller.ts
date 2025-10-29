import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Container } from '../../bootstrap/container.js';
import { generateUploadId, updateUploadStatus, getUploadStatus } from '../../shared/uploadStatus.js';

export function makeUploadHandler(container: Container) {
  return async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const uploadId = generateUploadId();
    try {
      const file = req.file;
      const embeddingProvider = (req.body?.embeddingProvider === 'ollama') ? 'ollama' : 'openai';

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      updateUploadStatus(uploadId, { status: 'Extracting text...', progress: 10 });

      // Choose embedding provider per request (reuse container deps)
      const embeddings = embeddingProvider === 'ollama'
        ? container.providers.embeddings.ollama
        : container.providers.embeddings.openai;

      const ingestion = new container.services.ingestion.constructor(
        container.providers.pdf,
        embeddings,
        container.repositories.documents,
        container.repositories.chunks,
        container.config.rag.maxEmbeddingChars
      );

      updateUploadStatus(uploadId, { status: 'Indexing document...', progress: 40 });

      const docId = await ingestion.ingest(file.path, file.originalname);

      updateUploadStatus(uploadId, { status: 'Finalizing...', progress: 90 });

      // Cleanup temp file
      try { fs.unlinkSync(file.path); } catch {}

      updateUploadStatus(uploadId, { status: 'Upload complete!', progress: 100 });

      const title = path.basename(file.originalname, path.extname(file.originalname));
      return res.json({ id: docId, title, originalname: file.originalname, uploadId });
    } catch (error) {
      console.error('[HTTP] /api/documents/upload error', error);
      updateUploadStatus(uploadId, { status: 'Failed', progress: 100, error: 'Upload failed' });
      return res.status(500).json({ error: 'Upload failed', uploadId });
    }
  };
}

export function makeGetUploadStatusHandler() {
  return (req: Request, res: Response) => {
    const { uploadId } = req.params as { uploadId: string };
    return res.json(getUploadStatus(uploadId));
  };
}

export function makeListDocumentsHandler(container: Container) {
  return (_req: Request, res: Response) => {
    try {
      const docs = container.repositories.documents.list().map(d => ({
        id: d.id,
        title: d.title,
        originalname: d.originalname,
        created_at: d.createdAt
      }));
      return res.json({ documents: docs });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to list documents' });
    }
  };
}

export function makeDeleteDocumentHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      container.repositories.documents.delete(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete document' });
    }
  };
}

export function makeDocumentUsageHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      const docId = Number(req.params.id);
      const entries = container.repositories.usage.forDocument(docId);
      return res.json(entries);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read usage log' });
    }
  };
}


