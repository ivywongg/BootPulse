import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations use a direct or session-pooler connection when DIRECT_URL is set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
