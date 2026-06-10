import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { createDb, type Db } from '@/lib/db/client';
import { seedDb } from '@/lib/seed/seedDb';

export function makeTestDb({ seed = false } = {}): Db {
  const db = createDb(':memory:');
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  if (seed) seedDb(db);
  return db;
}

/** Points the app's getDb() singleton at a test database. */
export function injectAppDb(db: Db): void {
  (globalThis as unknown as { __ipodDb?: Db }).__ipodDb = db;
}

export function okResponse(body: string): Response {
  return new Response(body, { status: 200 });
}

export const failingFetch: typeof fetch = () =>
  Promise.reject(new Error('network down'));
