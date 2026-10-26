import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | undefined;

function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Use the Supabase pooled connection string (server-only).');
  }
  // Supabase's transaction pooler does not support prepared statements; keep the pool tiny per serverless instance.
  return drizzle(postgres(url, { prepare: false, max: 3 }), { schema });
}

export function getDb(): Db {
  instance ??= connect();
  return instance;
}

/** Test hook: swap in an in-memory Postgres-compatible database. */
export function setDbForTests(testDb: unknown) {
  instance = testDb as Db;
}

// Connects on first query so builds and imports never need credentials.
export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    const target = getDb();
    const value = Reflect.get(target, property);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
