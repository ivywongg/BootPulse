import Database from 'better-sqlite3';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const configuredUrl = process.env.DATABASE_URL ?? 'file:./data/bootpulse.db';
const databasePath = configuredUrl.startsWith('file:')
  ? configuredUrl.slice('file:'.length)
  : configuredUrl;
const resolvedDatabasePath = resolve(databasePath);

mkdirSync(dirname(resolvedDatabasePath), { recursive: true });

const sqlite = new Database(resolvedDatabasePath);
sqlite.pragma('foreign_keys = ON');
chmodSync(resolvedDatabasePath, 0o600);
// Additive local-auth migration: no existing business or user rows are rewritten.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS local_credentials (
    user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
`);
export const db = drizzle(sqlite);
