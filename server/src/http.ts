import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

export const asyncRoute = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { void handler(req, res, next).catch(next); };

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  void _next;
  if (error instanceof ZodError) return res.status(400).json({ message: 'Please correct the highlighted fields.', issues: error.flatten() });
  if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
