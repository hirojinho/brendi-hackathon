import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Container } from '../../bootstrap/container.js';
import { DocumentIngestionService } from '../../app/documents/DocumentIngestionService.js';
import { generateUploadId, updateUploadStatus, getUploadStatus } from '../../shared/uploadStatus.js';

export function makeUploadHandler(container: Container) {
  return async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const uploadId = generateUploadId();

    try {
      const uploadedFile = req.file;
      const embeddingProviderName = (req.body?.embeddingProvider === 'ollama') ? 'ollama' : 'openai';

      if (!uploadedFile) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      updateUploadStatus(uploadId, { status: 'Extracting text...', progress: 10 });

      // Choose embedding provider for this request
      const selectedEmbeddingProvider = embeddingProviderName === 'ollama'
        ? container.providers.embeddings.ollama
        : container.providers.embeddings.openai;

      const ingestionService = new DocumentIngestionService(
        container.providers.pdf,
        selectedEmbeddingProvider,
        container.repositories.documents,
        container.repositories.chunks,
        container.config.rag.maxEmbeddingChars
      );

      updateUploadStatus(uploadId, { status: 'Indexing document...', progress: 40 });

      const documentId = await ingestionService.ingest(uploadedFile.path, uploadedFile.originalname);

      updateUploadStatus(uploadId, { status: 'Finalizing...', progress: 90 });

      // Cleanup temp file
      try {
        fs.unlinkSync(uploadedFile.path);
      } catch {}

      updateUploadStatus(uploadId, { status: 'Upload complete!', progress: 100 });

      const title = path.basename(uploadedFile.originalname, path.extname(uploadedFile.originalname));
      return res.json({ id: documentId, title, originalname: uploadedFile.originalname, uploadId });
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
      const documentSummaries = container.repositories.documents.list().map(document => ({
        id: document.id,
        title: document.title,
        originalname: document.originalname,
        created_at: document.createdAt
      }));

      return res.json({ documents: documentSummaries });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to list documents' });
    }
  };
}

export function makeDeleteDocumentHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      container.repositories.documents.delete(documentId);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete document' });
    }
  };
}

export function makeDocumentUsageHandler(container: Container) {
  return (req: Request, res: Response) => {
    try {
      const documentId = Number(req.params.id);
      const usageEntries = container.repositories.usage.forDocument(documentId);
      return res.json(usageEntries);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read usage log' });
    }
  };
}


