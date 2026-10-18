import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/errors.js';
import { env, isProd } from '../config/env.js';
import { logger } from '../config/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message);
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Mongoose duplicate key
  if (typeof err === 'object' && err !== null && (err as any).code === 11000) {
    return res.status(409).json({
      error: { message: 'Duplicate value for a unique field', code: 'CONFLICT' },
    });
  }

  // Multer file-size errors
  if (typeof err === 'object' && err !== null && (err as any).name === 'MulterError') {
    return res.status(400).json({
      error: { message: (err as any).message, code: 'UPLOAD_ERROR' },
    });
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: {
      message: isProd ? 'Something went wrong' : (err as Error)?.message ?? 'Something went wrong',
      code: 'INTERNAL',
      ...(env.NODE_ENV !== 'production' ? { stack: (err as Error)?.stack } : {}),
    },
  });
}
