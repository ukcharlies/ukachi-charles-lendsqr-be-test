import knex, { type Knex } from 'knex';
import { databaseConfig } from '../config/database.js';
let database: Knex | undefined;
export function getDatabase(): Knex {
  database ??= knex(databaseConfig());
  return database;
}
export async function closeDatabase(): Promise<void> {
  await database?.destroy();
  database = undefined;
}
