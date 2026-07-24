import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase } from './knex.js';

const db = getDatabase();
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const command = process.argv[2];

try {
  if (command === 'up') {
    const [, migrations] = await db.migrate.latest({ directory });
    console.log(migrations.length ? `Applied: ${migrations.join(', ')}` : 'Already up to date');
  } else if (command === 'down') {
    const [, migrations] = await db.migrate.rollback({ directory });
    console.log(
      migrations.length ? `Rolled back: ${migrations.join(', ')}` : 'Nothing to roll back',
    );
  } else {
    throw new Error('Expected migration command: up or down');
  }
} finally {
  await db.destroy();
}
