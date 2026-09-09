import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { clearSessionCookie, requireAuth, setSessionCookie, signToken, type AuthenticatedRequest } from '../auth.js';
import { asyncRoute, HttpError } from '../http.js';
import { prisma } from '../prisma.js';

const router = Router();
const credentialsSchema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(10).max(128) });
const registerSchema = credentialsSchema.extend({ name: z.string().trim().min(1).max(100) });
const publicUser = (user: { id: string; name: string; email: string }) => ({ id: user.id, name: user.name, email: user.email });

router.post('/register', asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists. Please log in instead.');
  const user = await prisma.user.create({ data: { name: input.name, email, passwordHash: await bcrypt.hash(input.password, 12) } });
  setSessionCookie(res, signToken(user.id));
  res.status(201).json({ user: publicUser(user) });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const input = credentialsSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new HttpError(401, 'Email or password is incorrect.');
  setSessionCookie(res, signToken(user.id));
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (_req, res) => { clearSessionCookie(res); res.status(204).end(); });
router.get('/me', requireAuth, asyncRoute(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, 'Your account could not be found. Please log in again.');
  res.json({ user: publicUser(user) });
}));

export default router;
