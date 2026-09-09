import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from './config.js';
import { HttpError } from './http.js';

const hasObjectStorage = Boolean(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_BUCKET);
const localRoot = resolve(process.cwd(), 'uploads');
const client = hasObjectStorage ? new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! }
}) : null;

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-140);
export const buildStorageKey = (userId: string, name: string) => `resumes/${userId}/${randomUUID()}-${safeName(name)}`;

export async function storeFile(key: string, file: Express.Multer.File) {
  if (client) {
    await client.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    return;
  }
  if (env.NODE_ENV === 'production') throw new HttpError(503, 'Resume storage has not been configured yet.');
  const destination = resolve(localRoot, key);
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination, file.buffer);
}

export async function removeFile(key: string) {
  if (client) { await client.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key })); return; }
  await unlink(resolve(localRoot, key)).catch(() => undefined);
}

export async function getDownloadUrl(key: string) {
  if (!client) return null;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), { expiresIn: 60 });
}

export const getLocalFilePath = (key: string) => resolve(localRoot, key);
