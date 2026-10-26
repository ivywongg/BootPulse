import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { randomUUID } from 'node:crypto';
import { db, setDbForTests } from '../db';
import { createDemoBusiness } from '../db/seed';
import { subscriptions, teamMembers, users } from '../db/schema';
import { CONSENT_VERSION } from '../lib/auth-validation';
import type { PlanName } from '../lib/plans';
import * as schema from '../db/schema';

/** Fresh in-memory Postgres with the repo's real migrations applied. */
export async function createTestDb() {
  const testDb = drizzle(new PGlite(), { schema });
  await migrate(testDb, { migrationsFolder: './drizzle' });
  setDbForTests(testDb);
  return testDb;
}

export async function makeUser(email: string, plan: PlanName = 'free') {
  const [user] = await db
    .insert(users)
    .values({ id: randomUUID(), email, privacyConsentAt: new Date(), consentVersion: CONSENT_VERSION })
    .returning();
  await db.insert(subscriptions).values({ userId: user.id, plan });
  return user;
}

export async function makeDemoFor(userId: string) {
  return db.transaction((tx) => createDemoBusiness(tx, userId));
}

export async function addMember(businessId: string, userId: string, role: 'owner' | 'collaborator') {
  await db.insert(teamMembers).values({ businessId, userId, role });
}
