import { Response } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  code = 'CONFLICT';
}

export function handleError(err: unknown, res: Response): Response {
  console.error('[HTTP] Error:', err);

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ 
      error: err.message || 'Validation error',
      code: err.code
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({ 
      error: err.message || 'Resource not found',
      code: err.code
    });
  }

  if (err instanceof ConflictError) {
    return res.status(err.statusCode).json({ 
      error: err.message || 'Conflict',
      code: err.code
    });
  }

  if (err instanceof Error) {
    // Check for specific error patterns
    if (err.message.includes('API key')) {
      return res.status(500).json({ 
        error: 'API key configuration error',
        details: err.message
      });
    }

    if (err.message.includes('rate limit') || err.message.includes('Rate limit')) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        details: err.message
      });
    }

    if (err.message.includes('circular reference') || err.message.includes('Parent context not found')) {
      return res.status(400).json({ 
        error: err.message
      });
    }

    if (err.message.includes('children')) {
      return res.status(400).json({ 
        error: err.message
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  return res.status(500).json({ 
    error: 'Internal server error'
  });
}

export function asyncHandler(
  fn: (req: any, res: Response) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      handleError(err, res);
    });
  };
}

