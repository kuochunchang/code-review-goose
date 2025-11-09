import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '../types/server.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  const response: ApiResponse = {
    success: false,
    error: err.message || 'Server error',
  };

  res.status(500).json(response);
}
