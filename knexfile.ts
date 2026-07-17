import type { Knex } from 'knex';
import { databaseConfig } from './src/config/database.js';
const config: Record<string, Knex.Config> = {
  development: databaseConfig(),
  test: databaseConfig(),
  production: databaseConfig(),
};
export default config;
