import { Request, Response } from 'express';
import { Container } from '../../bootstrap/container.js';

function buildRagPrompt(userMessage: string, retrievedChunks: Array<{ chunkText: string }>): string {
  if (retrievedChunks.length === 0) return userMessage;

  const citedSources = retrievedChunks
    .map((retrievedChunk, index) => `[Source ${index + 1}] ${retrievedChunk.chunkText}`)
    .join('\n\n');

  return `Based on the following sources, please provide a response. Cite source numbers where used.\n\nSources:\n${citedSources}\n\nUser question: ${userMessage}`;
}

export function makeChatHandler(container: Container) {
  return async (req: Request, res: Response) => {
    try {
      const { message, history = [], model = 'openai', modelName, useRag = false, maxChunks } = req.body || {};

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required and must be a string' });
      }

      const retrievedChunks = useRag
        ? await container.services.rag.retrieve(message, Number(maxChunks) || container.config.rag.defaultMaxChunks)
        : [];

      const prompt = useRag ? buildRagPrompt(message, retrievedChunks) : message;

      const assistantResponse = await container.services.chat.respond(
        { message, history, model, modelName, useRag },
        prompt
      );

      if (useRag && retrievedChunks.length > 0) {
        const relatedDocumentId = retrievedChunks[0].documentId;
        const usedChunkIndexes = retrievedChunks.map(chunk => chunk.chunkIndex);
        container.services.rag.logUsage(relatedDocumentId, usedChunkIndexes, assistantResponse.slice(0, 500));
      }

      return res.json({
        response: assistantResponse,
        retrievedChunks: useRag
          ? retrievedChunks.map(chunk => ({
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex,
              text: chunk.chunkText,
              similarity: chunk.similarity
            }))
          : undefined
      });
    } catch (error) {
      console.error('[HTTP] /api/chat error', error);
      return res.status(500).json({ error: 'Failed to generate response' });
    }
  };
}


