import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { createDemoBusiness } from '../db/seed';
import { subscriptions, users } from '../db/schema';
import { CONSENT_VERSION } from './auth-validation';

export type AppUser = typeof users.$inferSelect;

/**
 * Finds the app profile for a Supabase user, creating it (with a Free demo plan and the
 * fictional demo business) on first use. Consent comes from the sign-up server action.
 * Returns null when the account never recorded consent to the current statement.
 */
export async function ensureAppUser(authUser: User): Promise<AppUser | null> {
  const [existing] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (existing) return existing;

  const email = authUser.email?.toLowerCase();
  const consentAt = new Date(String(authUser.user_metadata?.consent_at ?? ''));
  const validConsent =
    authUser.user_metadata?.consent_version === CONSENT_VERSION &&
    Number.isFinite(consentAt.getTime()) &&
    consentAt.getTime() <= Date.now();
  if (!email || !authUser.email_confirmed_at || !validConsent) return null;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({ id: authUser.id, email, privacyConsentAt: consentAt, consentVersion: CONSENT_VERSION })
      .onConflictDoNothing()
      .returning();
    if (!created) {
      const [raced] = await tx.select().from(users).where(eq(users.id, authUser.id)).limit(1);
      return raced ?? null;
    }
    await tx.insert(subscriptions).values({ userId: created.id, plan: 'free' });
    await createDemoBusiness(tx, created.id);
    return created;
  });
}
