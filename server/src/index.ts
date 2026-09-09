import { app } from './app.js';
import { env } from './config.js';
import { prisma } from './prisma.js';

async function start() {
  await prisma.$connect();
  const server = app.listen(env.PORT, () => console.log(`Trackify API listening on http://localhost:${env.PORT}`));
  const shutdown = async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

start().catch((error: unknown) => { console.error('Unable to start Trackify.', error); process.exit(1); });
