import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';

function buildPrompt(message: string, chunks: Array<{ chunkText: string }>): string {
  if (!chunks.length) return message;
  const sources = chunks.map((c, i) => `[Source ${i + 1}] ${c.chunkText}`).join('\n\n');
  return `Based on the following sources, please provide a response. Cite source numbers where used.\n\nSources:\n${sources}\n\nUser question: ${message}`;
}

export function makeChatHandler(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { message, history = [], model = 'openai', modelName, useRag = false, maxChunks } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      const ragChunks = useRag
        ? await container.services.rag.retrieve(message, Number(maxChunks) || container.config.rag.defaultMaxChunks)
        : [];

      const prompt = useRag ? buildPrompt(message, ragChunks) : message;
      const response = await container.services.chat.respond({ message, history, model, modelName, useRag }, prompt);

      if (useRag && ragChunks.length) {
        // Log against the first document for now (matches current behavior style)
        const docId = ragChunks[0].documentId;
        const idxs = ragChunks.map(c => c.chunkIndex);
        container.services.rag.logUsage(docId, idxs, response.slice(0, 500));
      }

      return res.json({
        response,
        retrievedChunks: useRag
          ? ragChunks.map(c => ({ documentId: c.documentId, chunkIndex: c.chunkIndex, text: c.chunkText, similarity: c.similarity }))
          : undefined
      });
    } catch (err) {
      console.error('[HTTP] /api/chat error', err);
      return res.status(500).json({ error: 'Failed to generate response' });
    }
  };
}


