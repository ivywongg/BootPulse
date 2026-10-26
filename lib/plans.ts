import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { subscriptions, teamMembers } from '../db/schema';
import type { WarningType } from './calc/warnings';

export type PlanName = 'free' | 'founder' | 'adviser';

export type PlanLimits = {
  businesses: number;
  forecastMonths: number;
  customScenarios: boolean;
  warnings: readonly WarningType[];
};

const RUNWAY_ONLY_WARNINGS: readonly WarningType[] = ['runway_risk'];
const ALL_WARNINGS: readonly WarningType[] = ['runway_risk', 'rising_costs', 'falling_revenue'];

export const PLAN_LIMITS: Readonly<Record<PlanName, PlanLimits>> = {
  free: { businesses: 1, forecastMonths: 6, customScenarios: false, warnings: RUNWAY_ONLY_WARNINGS },
  founder: { businesses: 1, forecastMonths: 24, customScenarios: true, warnings: ALL_WARNINGS },
  adviser: { businesses: 10, forecastMonths: 24, customScenarios: true, warnings: ALL_WARNINGS },
};

// Fictional prices for the assignment demo; nothing is ever charged.
export const PLAN_DETAILS: ReadonlyArray<{ name: PlanName; label: string; price: string; description: string }> = [
  { name: 'free', label: 'Free', price: '$0', description: 'A focused starting point for one business.' },
  { name: 'founder', label: 'Founder', price: '$19/mo', description: 'Longer forecasts, custom scenarios and every warning.' },
  { name: 'adviser', label: 'Adviser', price: '$49/mo', description: 'Up to ten businesses for advisory work.' },
];

export function isPlanName(value: unknown): value is PlanName {
  return value === 'free' || value === 'founder' || value === 'adviser';
}

export async function getUserPlan(userId: string): Promise<PlanName> {
  const [row] = await db.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row?.plan ?? 'free';
}

/** Shared-business features follow the owner's plan; a collaborator's own plan never applies. */
export async function getBusinessPlan(businessId: string): Promise<PlanName> {
  const [row] = await db
    .select({ plan: subscriptions.plan })
    .from(teamMembers)
    .innerJoin(subscriptions, eq(subscriptions.userId, teamMembers.userId))
    .where(and(eq(teamMembers.businessId, businessId), eq(teamMembers.role, 'owner')))
    .limit(1);
  return row?.plan ?? 'free';
}
