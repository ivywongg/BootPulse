import { eq } from 'drizzle-orm';
import { db } from '../db';
import { subscriptions } from '../db/schema';
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
  free: {
    businesses: 1,
    forecastMonths: 6,
    customScenarios: false,
    warnings: RUNWAY_ONLY_WARNINGS,
  },
  founder: {
    businesses: 1,
    forecastMonths: 24,
    customScenarios: true,
    warnings: ALL_WARNINGS,
  },
  adviser: {
    businesses: 10,
    forecastMonths: 24,
    customScenarios: true,
    warnings: ALL_WARNINGS,
  },
};

export function getUserPlan(userId: string): PlanName {
  const subscription = db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get();

  return subscription?.plan ?? 'free';
}
