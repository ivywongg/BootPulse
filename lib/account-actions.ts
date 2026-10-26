'use server';

import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '../db';
import { businesses, subscriptions, teamMembers, users } from '../db/schema';
import { ACTIVE_BUSINESS_COOKIE } from './access';
import { getAuthenticatedUser } from './auth';
import { isPlanName } from './plans';
import { adminConfigured, createAdminClient } from './supabase/admin';
import { createClient } from './supabase/server';

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Authentication required.');
  return user;
}

/**
 * Assignment demo only: records the chosen plan for the signed-in user. No payment is collected,
 * no billing identifiers exist. Switching never deletes business data.
 */
export async function setDemoPlan(plan: unknown) {
  if (!isPlanName(plan)) throw new Error('Unknown plan.');
  const user = await requireUser();
  await db
    .insert(subscriptions)
    .values({ userId: user.id, plan })
    .onConflictDoUpdate({ target: subscriptions.userId, set: { plan, updatedAt: new Date() } });
}

/** Deletes the Supabase Auth user and every business the user owns, then signs out. */
export async function deleteAccount(confirmation: unknown) {
  z.literal('delete').parse(confirmation);
  const user = await requireUser();
  if (!adminConfigured()) throw new Error('Account deletion is not configured on this server.');

  const owned = await db
    .select({ businessId: teamMembers.businessId })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.role, 'owner')));

  // Auth user first, outside any transaction: on Supabase the foreign key cascades the profile,
  // memberships and demo plan, and a held row lock would block the auth service's delete.
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) throw new Error('Could not delete the sign-in account.');

  await db.transaction(async (tx) => {
    for (const { businessId } of owned) await tx.delete(businesses).where(eq(businesses.id, businessId));
    await tx.delete(users).where(eq(users.id, user.id)); // no-op where the cascade already ran
  });

  try {
    await (await createClient()).auth.signOut();
  } catch {
    // The user no longer exists; clearing cookies below is enough.
  }
  (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
}
