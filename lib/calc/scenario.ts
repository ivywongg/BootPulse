import type { ScenarioAssumptions } from './types';

/** Whole cents, halves rounded away from zero; toPrecision drops float noise such as 99000.00000000001. */
export function roundCents(value: number): number {
  const clean = Number(value.toPrecision(12));
  return Math.sign(clean) * Math.round(Math.abs(clean));
}

export interface ScenarioTotals {
  revenue: number;
  costs: number;
}

function extraCostApplies(assumptions: ScenarioAssumptions, monthIndex: number) {
  if (assumptions.extraOneOffMonth === null) {
    return false;
  }

  if (typeof assumptions.extraOneOffMonth === 'number') {
    return assumptions.extraOneOffMonth === monthIndex;
  }

  return Number(assumptions.extraOneOffMonth) === monthIndex;
}

export function applyAssumptions(
  baseRevenue: number,
  baseCosts: number,
  assumptions: ScenarioAssumptions,
  m: number,
): ScenarioTotals {
  if (!Number.isInteger(m) || m < 1) {
    throw new Error('Scenario month index must be a positive integer.');
  }

  const revenueFactor =
    (1 + assumptions.priceChangePct / 100) *
    (1 - assumptions.revenueLossPct / 100) *
    Math.pow(1 + assumptions.revenueGrowthPct / 100, m - 1);

  const revenue = roundCents(baseRevenue * revenueFactor);
  const costs =
    baseCosts +
    assumptions.extraRecurringCostCents +
    (extraCostApplies(assumptions, m) ? assumptions.extraOneOffCostCents : 0);

  return { revenue, costs };
}
