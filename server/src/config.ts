import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
dotenv.config({ path: resolve(projectRoot, '.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).default('postgresql://trackify:trackify@localhost:5432/trackify?schema=public'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-before-production'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  S3_ENDPOINT: z.string().url().optional().or(z.literal('')),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('trackify-resumes'),
  S3_ACCESS_KEY_ID: z.string().optional().or(z.literal('')),
  S3_SECRET_ACCESS_KEY: z.string().optional().or(z.literal(''))
});

const parsed = schema.parse(process.env);

if (parsed.NODE_ENV === 'production' && parsed.JWT_SECRET === 'development-only-secret-change-before-production') {
  throw new Error('JWT_SECRET must be configured in production.');
}

export const env = {
  ...parsed,
  COOKIE_SECURE: parsed.COOKIE_SECURE === 'true'
};
