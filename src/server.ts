import { createServer } from 'node:http';
import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { logger } from './config/logger.js';
import { closeDatabase, getDatabase } from './database/knex.js';
const env = getEnv();
const server = createServer(createApp(getDatabase()));
server.listen(env.PORT, '0.0.0.0', () =>
  logger.info({ port: env.PORT }, 'Demo Credit API started'),
);
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown started');
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
