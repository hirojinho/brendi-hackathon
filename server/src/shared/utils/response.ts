import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): void {
  res.status(statusCode).json(data);
}

export function sendError(res: Response, error: string, statusCode: number = 500, details?: string): void {
  res.status(statusCode).json({ 
    error,
    ...(details && { details })
  });
}

export function sendNotFound(res: Response, resource: string = 'Resource'): void {
  res.status(404).json({ error: `${resource} not found` });
}

export function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

