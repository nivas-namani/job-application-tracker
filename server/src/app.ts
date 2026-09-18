import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './config.js';
import { errorHandler } from './http.js';
import authRouter from './routes/auth.js';
import applicationsRouter from './routes/applications.js';
import processesRouter from './routes/processes.js';
import resumesRouter from './routes/resumes.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https:'] } } }));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/processes', processesRouter);
app.use('/api/resumes', resumesRouter);

const clientDist = resolve(process.cwd(), 'client', 'dist');
if (env.NODE_ENV === 'production' && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(clientDist, 'index.html')));
}

app.use(errorHandler);
