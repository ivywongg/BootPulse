import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Applies ./drizzle migrations. Run deliberately; never on request or at build time.
async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('Set DIRECT_URL (preferred) or DATABASE_URL.');
  const client = postgres(url, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  } finally {
    await client.end();
  }
  console.log('Migrations applied.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
