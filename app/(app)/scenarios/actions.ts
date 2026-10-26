'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../../db';
import { scenarios } from '../../../db/schema';
import { requireBusinessAccess } from '../../../lib/access';
import { getAuthenticatedUser } from '../../../lib/auth';
import { getUserPlan, PLAN_LIMITS } from '../../../lib/plans';
import { entityIdSchema, moneyCentsSchema, monthDateSchema } from '../../../lib/validation';

const MAX_SCENARIO_MONEY_CENTS = Number.MAX_SAFE_INTEGER;

const percentageInput = z.union([
  z.number().finite(),
  z.string().trim().min(1).max(64),
]);

const percentage = (min: number, max: number) =>
  percentageInput
    .transform((value) => Number(value))
    .pipe(z.number().finite().min(min).max(max));

const scenarioMoneyCentsSchema = moneyCentsSchema.pipe(
  z.number().int().min(0).max(MAX_SCENARIO_MONEY_CENTS),
);

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
  if (!user) {
    throw new Error('You must be signed in and have accepted the privacy notice.');
  }
  return user;
}

async function requireScenarioOwner(userId: string, businessId: string, scenarioId: string) {
  requireBusinessAccess(userId, businessId);
  const scenario = db
    .select()
    .from(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.businessId, businessId)))
    .get();
  if (!scenario) throw new Error('Scenario not found.');
  return scenario;
}

export async function updatePresetAssumptions(
  businessId: unknown,
  scenarioId: unknown,
  input: unknown,
) {
  const validatedBusinessId = entityIdSchema.parse(businessId);
  const validatedScenarioId = entityIdSchema.parse(scenarioId);
  const assumptions = normalizeAssumptions(input);
  const user = await requireAuthenticatedUser();
  const scenario = await requireScenarioOwner(user.id, validatedBusinessId, validatedScenarioId);
  if (scenario.kind === 'custom') {
    throw new Error('Custom scenarios use the custom scenario action.');
  }

  return db
    .update(scenarios)
    .set(assumptions)
    .where(and(eq(scenarios.id, validatedScenarioId), eq(scenarios.businessId, validatedBusinessId)))
    .returning()
    .get();
}

export async function createCustomScenario(
  businessId: unknown,
  name: unknown,
  input: unknown,
) {
  const validatedBusinessId = entityIdSchema.parse(businessId);
  const validatedName = scenarioNameSchema.parse(name);
  const assumptions = normalizeAssumptions(input);
  const user = await requireAuthenticatedUser();
  requireBusinessAccess(user.id, validatedBusinessId);
  const plan = getUserPlan(user.id);
  if (!PLAN_LIMITS[plan].customScenarios) {
    throw new Error('Custom scenarios require a Founder or Adviser plan.');
  }

  return db
    .insert(scenarios)
    .values({
      businessId: validatedBusinessId,
      name: validatedName,
      kind: 'custom',
      ...assumptions,
    })
    .returning()
    .get();
}
