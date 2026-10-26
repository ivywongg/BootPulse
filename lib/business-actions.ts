'use server';

import { and, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { db } from '../db';
import { seedBusinessDefaults } from '../db/seed';
import { businesses, teamMembers, users } from '../db/schema';
import { ACTIVE_BUSINESS_COOKIE, listUserBusinesses, requireBusinessAccess, requireBusinessOwner } from './access';
import { getAuthenticatedUser } from './auth';
import { emailSchema } from './auth-validation';
import { getUserPlan, PLAN_LIMITS } from './plans';
import { entityIdSchema, moneyCentsSchema, monthDateSchema } from './validation';

const MAX_COLLABORATORS = 10;
const businessNameSchema = z.string().trim().min(1).max(120);

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Authentication required.');
  return user;
}

/** Owners and collaborators may rename a business. */
export async function renameBusiness(businessId: unknown, name: unknown) {
  const user = await requireUser();
  const id = await requireBusinessAccess(user.id, entityIdSchema.parse(businessId));
  await db.update(businesses).set({ name: businessNameSchema.parse(name) }).where(eq(businesses.id, id));
}

/** Opening cash and start month are planning data, so collaborators may edit them. */
export async function updateCashSettings(businessId: unknown, cashBalance: unknown, cashStartMonth: unknown) {
  const user = await requireUser();
  const id = await requireBusinessAccess(user.id, entityIdSchema.parse(businessId));
  await db
    .update(businesses)
    .set({
      cashBalanceCents: moneyCentsSchema.parse(cashBalance),
      cashStartMonth: monthDateSchema.parse(cashStartMonth),
    })
    .where(eq(businesses.id, id));
}

/** Creates an owned business with default categories and presets, within the caller's plan limit. */
export async function createBusiness(name: unknown, cashBalance: unknown, cashStartMonth: unknown) {
  const user = await requireUser();
  const values = {
    name: businessNameSchema.parse(name),
    cashBalanceCents: moneyCentsSchema.parse(cashBalance),
    cashStartMonth: monthDateSchema.parse(cashStartMonth),
  };
  const limit = PLAN_LIMITS[await getUserPlan(user.id)].businesses;

  const created = await db.transaction(async (tx) => {
    // Serialise concurrent creations per user so the plan limit cannot be raced.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
    const [{ owned }] = await tx
      .select({ owned: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.role, 'owner')));
    if (owned >= limit) throw new Error('Business limit reached for your plan.');

    const [business] = await tx.insert(businesses).values({ ...values, currency: 'USD', isDemo: false }).returning();
    await tx.insert(teamMembers).values({ businessId: business.id, userId: user.id, role: 'owner' });
    await seedBusinessDefaults(tx, business.id);
    return business;
  });

  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, created.id, { maxAge: 31_536_000, path: '/', sameSite: 'lax' });
  return created;
}

/** Owner only. Keeps at least one accessible business so the workspace always has something to open. */
export async function deleteBusiness(businessId: unknown, confirmation: unknown) {
  z.literal('delete').parse(confirmation);
  const user = await requireUser();
  const id = await requireBusinessOwner(user.id, entityIdSchema.parse(businessId));
  const accessible = await listUserBusinesses(user.id);
  if (accessible.length <= 1) {
    throw new Error('You cannot delete your only business. Edit it instead, or delete your account from Settings.');
  }
  await db.delete(businesses).where(eq(businesses.id, id));
  (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
}

/** Owner only: grant an existing registered account edit access to planning data. */
export async function addCollaborator(businessId: unknown, email: unknown) {
  const user = await requireUser();
  const id = await requireBusinessOwner(user.id, entityIdSchema.parse(businessId));
  const parsedEmail = emailSchema.parse(email);

  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsedEmail)).limit(1);
  if (!target) throw new Error('No registered BootPulse account uses that email address.');
  if (target.id === user.id) throw new Error('You already own this business.');

  const members = await db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.businessId, id));
  if (members.some((member) => member.userId === target.id)) throw new Error('That account already has access.');
  if (members.length > MAX_COLLABORATORS) throw new Error('Collaborator limit reached.');

  await db.insert(teamMembers).values({ businessId: id, userId: target.id, role: 'collaborator' });
}

/** Owner only. The owner row can never be removed here. */
export async function removeCollaborator(businessId: unknown, userId: unknown) {
  const user = await requireUser();
  const id = await requireBusinessOwner(user.id, entityIdSchema.parse(businessId));
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.businessId, id), eq(teamMembers.userId, entityIdSchema.parse(userId)), eq(teamMembers.role, 'collaborator')));
}

export async function listCollaborators(businessId: string) {
  const user = await requireUser();
  const id = await requireBusinessOwner(user.id, businessId);
  return db
    .select({ userId: users.id, email: users.email })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(and(eq(teamMembers.businessId, id), eq(teamMembers.role, 'collaborator')));
}
