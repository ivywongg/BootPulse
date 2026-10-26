import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { db } from '../db';
import { businesses, teamMembers } from '../db/schema';
import { entityIdSchema } from './validation';

const ACTIVE_BUSINESS_COOKIE = 'bp_business';

export function requireBusinessAccess(userId: string, businessId: string) {
  const parsedUserId = entityIdSchema.safeParse(userId);
  const parsedBusinessId = entityIdSchema.safeParse(businessId);
  if (!parsedUserId.success || !parsedBusinessId.success) {
    notFound();
  }

  const membership = db
    .select({ businessId: teamMembers.businessId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, parsedUserId.data),
        eq(teamMembers.businessId, parsedBusinessId.data),
        eq(teamMembers.role, 'owner'),
      ),
    )
    .get();

  if (!membership) {
    notFound();
  }

  return parsedBusinessId.data;
}

export function listUserBusinesses(userId: string) {
  const parsedUserId = entityIdSchema.safeParse(userId);
  if (!parsedUserId.success) {
    return [];
  }

  return db
    .select({ business: businesses })
    .from(businesses)
    .innerJoin(teamMembers, eq(teamMembers.businessId, businesses.id))
    .where(and(eq(teamMembers.userId, parsedUserId.data), eq(teamMembers.role, 'owner')))
    .all()
    .map(({ business }) => business);
}

export async function getActiveBusiness(userId: string) {
  const userBusinesses = listUserBusinesses(userId);
  if (userBusinesses.length === 0) {
    notFound();
  }

  const activeBusinessId = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  const parsedActiveBusinessId = entityIdSchema.safeParse(activeBusinessId);
  const selectedBusiness = parsedActiveBusinessId.success
    ? userBusinesses.find((business) => business.id === parsedActiveBusinessId.data)
    : undefined;

  return selectedBusiness ?? userBusinesses[0];
}
