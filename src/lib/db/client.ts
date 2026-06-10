import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export type Db = BetterSQLite3Database<typeof schema>;

export function databasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'ipod.db');
}

export function createDb(filePath: string = databasePath()): Db {
  if (filePath !== ':memory:') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  return drizzle(sqlite, { schema });
}

// Singleton for the app; survives Next.js dev hot reloads via globalThis.
const globalForDb = globalThis as unknown as { __ipodDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__ipodDb) {
    globalForDb.__ipodDb = createDb();
  }
  return globalForDb.__ipodDb;
}
