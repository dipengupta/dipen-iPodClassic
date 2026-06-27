import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { createDb, databasePath } from '../src/lib/db/client';
import { clearAll, syncSeed } from '../src/lib/seed/seedDb';

const force = process.argv.includes('--force');
const db = createDb();
migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

// --force wipes everything (including the recorded fingerprints) so the sync
// below rebuilds every table from the committed seed.
if (force) {
  clearAll(db);
}

const changed = syncSeed(db);
console.log(
  changed.length
    ? `seeded ${databasePath()} (updated: ${changed.join(', ')})`
    : `${databasePath()} already up to date`,
);
