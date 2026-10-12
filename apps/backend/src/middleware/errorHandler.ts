import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle Mongoose duplicate key error (code 11000)
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Conflict: A resource with this unique identifier already exists.',
    });
    return;
  }

  console.error('[Error Handler]', err);

  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}
