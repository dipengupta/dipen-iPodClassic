import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { createDb, databasePath } from '../src/lib/db/client';
import { clearAll, isSeeded, seedDb } from '../src/lib/seed/seedDb';

const force = process.argv.includes('--force');
const db = createDb();
migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

if (isSeeded(db) && !force) {
  console.log(`${databasePath()} already seeded; use --force to reseed`);
  process.exit(0);
}
if (force) {
  clearAll(db);
}
seedDb(db);
console.log(`seeded ${databasePath()}`);
