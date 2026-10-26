import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../db';
import { businesses, subscriptions, teamMembers, users } from '../db/schema';
import { createTestDb } from '../test/db';
import { CONSENT_VERSION } from './auth-validation';
import { ensureAppUser } from './provision';

function authUser(overrides: Record<string, unknown> = {}): User {
  return {
    id: randomUUID(),
    email: 'New.Founder@Example.test',
    email_confirmed_at: new Date().toISOString(),
    user_metadata: { consent_version: CONSENT_VERSION, consent_at: new Date(Date.now() - 1000).toISOString() },
    ...overrides,
  } as unknown as User;
}

describe('first sign-in provisioning', () => {
  beforeAll(createTestDb);

  it('creates the profile, a Free demo plan and one fictional demo business with recorded consent', async () => {
    const supabaseUser = authUser();
    const created = await ensureAppUser(supabaseUser);
    expect(created).toMatchObject({ id: supabaseUser.id, email: 'new.founder@example.test', consentVersion: CONSENT_VERSION });

    const [plan] = await db.select().from(subscriptions).where(eq(subscriptions.userId, supabaseUser.id));
    expect(plan.plan).toBe('free');
    const owned = await db.select().from(teamMembers).where(eq(teamMembers.userId, supabaseUser.id));
    expect(owned).toHaveLength(1);
    const [business] = await db.select().from(businesses).where(eq(businesses.id, owned[0].businessId));
    expect(business).toMatchObject({ isDemo: true, cashBalanceCents: 1_000_000 });

    await ensureAppUser(supabaseUser); // idempotent
    expect(await db.select().from(teamMembers).where(eq(teamMembers.userId, supabaseUser.id))).toHaveLength(1);
  });

  it('refuses unconfirmed accounts and missing, stale or future consent', async () => {
    expect(await ensureAppUser(authUser({ email_confirmed_at: undefined }))).toBeNull();
    expect(await ensureAppUser(authUser({ user_metadata: {} }))).toBeNull();
    expect(await ensureAppUser(authUser({ user_metadata: { consent_version: 'PICS-v1', consent_at: new Date().toISOString() } }))).toBeNull();
    expect(await ensureAppUser(authUser({ user_metadata: { consent_version: CONSENT_VERSION, consent_at: new Date(Date.now() + 86_400_000).toISOString() } }))).toBeNull();
    expect(await db.select().from(users).where(eq(users.email, 'new.founder@example.test'))).toHaveLength(1);
  });
});
