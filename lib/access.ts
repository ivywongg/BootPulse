import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { db } from '../db';
import { businesses, teamMembers } from '../db/schema';
import { entityIdSchema } from './validation';

export const ACTIVE_BUSINESS_COOKIE = 'bp_business';

export type BusinessRole = 'owner' | 'collaborator';

export async function getBusinessRole(userId: string, businessId: string): Promise<BusinessRole | null> {
  const parsedUser = entityIdSchema.safeParse(userId);
  const parsedBusiness = entityIdSchema.safeParse(businessId);
  if (!parsedUser.success || !parsedBusiness.success) return null;
  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, parsedUser.data), eq(teamMembers.businessId, parsedBusiness.data)))
    .limit(1);
  return membership?.role ?? null;
}

/** Owner or collaborator: read and edit the business's planning data. Unrelated users get 404. */
export async function requireBusinessAccess(userId: string, businessId: string): Promise<string> {
  if (!(await getBusinessRole(userId, businessId))) notFound();
  return businessId;
}

/** Owner only: invitations, business deletion, plan-related actions. */
export async function requireBusinessOwner(userId: string, businessId: string): Promise<string> {
  const role = await getBusinessRole(userId, businessId);
  if (!role) notFound();
  if (role !== 'owner') throw new Error('Only the business owner can do this.');
  return businessId;
}

export async function listUserBusinesses(userId: string) {
  const parsedUser = entityIdSchema.safeParse(userId);
  if (!parsedUser.success) return [];
  const rows = await db
    .select({ business: businesses, role: teamMembers.role })
    .from(businesses)
    .innerJoin(teamMembers, eq(teamMembers.businessId, businesses.id))
    .where(eq(teamMembers.userId, parsedUser.data))
    .orderBy(businesses.createdAt);
  return rows.map(({ business, role }) => ({ ...business, role }));
}

export async function countOwnedBusinesses(userId: string) {
  return (await listUserBusinesses(userId)).filter((business) => business.role === 'owner').length;
}

/** The business chosen by the bp_business cookie when the user still has access, else their first business. */
export async function getActiveBusiness(userId: string) {
  const userBusinesses = await listUserBusinesses(userId);
  if (userBusinesses.length === 0) notFound();
  const chosen = entityIdSchema.safeParse((await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value);
  return (chosen.success && userBusinesses.find((business) => business.id === chosen.data)) || userBusinesses[0];
}
