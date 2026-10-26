'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../db';
import { scenarios } from '../../../db/schema';
import { requireBusinessAccess } from '../../../lib/access';
import { getAuthenticatedUser } from '../../../lib/auth';
import { getBusinessPlan, PLAN_LIMITS } from '../../../lib/plans';
import { entityIdSchema, MAX_MONEY_CENTS, moneyCentsSchema, monthDateSchema } from '../../../lib/validation';

const percentageInput = z.union([z.number().finite(), z.string().trim().min(1).max(64)]);

const percentage = (min: number, max: number) =>
  percentageInput
    .transform((value) => Number(value))
    .pipe(z.number().finite().min(min).max(max))
    // numeric(6,2) stores hundredths; reject finer precision instead of silently rounding.
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Use at most two decimal places.');

const scenarioMoneyCentsSchema = moneyCentsSchema.pipe(z.number().int().min(0).max(MAX_MONEY_CENTS));

const scenarioAssumptionsSchema = z.object({
  revenueGrowthPct: percentage(-100, 1000),
  priceChangePct: percentage(-100, 1000),
  revenueLossPct: percentage(0, 100),
  extraRecurringCost: scenarioMoneyCentsSchema,
  extraOneOffCost: scenarioMoneyCentsSchema,
  extraOneOffMonth: monthDateSchema.nullable().optional(),
});

const scenarioNameSchema = z.string().trim().min(1).max(100);

function normalizeAssumptions(input: unknown) {
  const parsed = scenarioAssumptionsSchema.parse(input);
  return {
    revenueGrowthPct: parsed.revenueGrowthPct,
    priceChangePct: parsed.priceChangePct,
    revenueLossPct: parsed.revenueLossPct,
    extraRecurringCostCents: parsed.extraRecurringCost,
    extraOneOffCostCents: parsed.extraOneOffCost,
    extraOneOffMonth: parsed.extraOneOffMonth ?? null,
  };
}

async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('You must be signed in.');
  return user;
}

/** Edits any scenario of a business the caller can access; custom scenarios also need the owner's plan to allow them. */
export async function updateScenarioAssumptions(businessId: unknown, scenarioId: unknown, input: unknown) {
  const validatedBusinessId = entityIdSchema.parse(businessId);
  const validatedScenarioId = entityIdSchema.parse(scenarioId);
  const assumptions = normalizeAssumptions(input);
  const user = await requireAuthenticatedUser();
  await requireBusinessAccess(user.id, validatedBusinessId);

  const [scenario] = await db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, validatedScenarioId), eq(scenarios.businessId, validatedBusinessId)))
    .limit(1);
  if (!scenario) throw new Error('Scenario not found.');
  if (scenario.kind === 'custom' && !PLAN_LIMITS[await getBusinessPlan(validatedBusinessId)].customScenarios) {
    throw new Error('Custom scenarios need a Founder or Adviser plan.');
  }

  const [updated] = await db
    .update(scenarios)
    .set(assumptions)
    .where(and(eq(scenarios.id, validatedScenarioId), eq(scenarios.businessId, validatedBusinessId)))
    .returning();
  return updated;
}

export async function createCustomScenario(businessId: unknown, name: unknown, input: unknown) {
  const validatedBusinessId = entityIdSchema.parse(businessId);
  const validatedName = scenarioNameSchema.parse(name);
  const assumptions = normalizeAssumptions(input);
  const user = await requireAuthenticatedUser();
  await requireBusinessAccess(user.id, validatedBusinessId);
  if (!PLAN_LIMITS[await getBusinessPlan(validatedBusinessId)].customScenarios) {
    throw new Error('Custom scenarios need a Founder or Adviser plan.');
  }

  const [created] = await db
    .insert(scenarios)
    .values({ businessId: validatedBusinessId, name: validatedName, kind: 'custom', ...assumptions })
    .returning();
  return created;
}

export async function deleteCustomScenario(businessId: unknown, scenarioId: unknown) {
  const validatedBusinessId = entityIdSchema.parse(businessId);
  const validatedScenarioId = entityIdSchema.parse(scenarioId);
  const user = await requireAuthenticatedUser();
  await requireBusinessAccess(user.id, validatedBusinessId);
  // Presets are never deleted; only custom scenarios.
  await db
    .delete(scenarios)
    .where(
      and(
        eq(scenarios.id, validatedScenarioId),
        eq(scenarios.businessId, validatedBusinessId),
        eq(scenarios.kind, 'custom'),
      ),
    );
}
