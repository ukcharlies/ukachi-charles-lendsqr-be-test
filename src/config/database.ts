import type { Knex } from 'knex';
import { getEnv } from './env.js';
export function databaseConfig(): Knex.Config {
  const e = getEnv();
  return {
    client: 'mysql2',
    connection: {
      host: e.DB_HOST,
      port: e.DB_PORT,
      database: e.DB_NAME,
      user: e.DB_USER,
      password: e.DB_PASSWORD,
      supportBigNumbers: true,
      bigNumberStrings: true,
      ...(e.DB_SSL
        ? {
            ssl: {
              ca: Buffer.from(e.DB_SSL_CA_BASE64!, 'base64').toString('utf8'),
              rejectUnauthorized: true,
            },
          }
        : {}),
    },
    pool: { min: e.DB_POOL_MIN, max: e.DB_POOL_MAX },
    migrations: { directory: './src/database/migrations', extension: 'ts' },
  };
}
