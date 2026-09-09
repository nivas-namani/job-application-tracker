import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { HttpError } from './http.js';

export type AuthenticatedRequest = Request & { userId?: string };

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie('trackify_token', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1_000
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie('trackify_token', { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/' });
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies.trackify_token;
  if (!token) return next(new HttpError(401, 'Please log in to continue.'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token');
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new HttpError(401, 'Your session has expired. Please log in again.'));
  }
}
