import type { ScenarioAssumptions } from './types';

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

  const revenue = Math.round(baseRevenue * revenueFactor);
  const costs =
    baseCosts +
    assumptions.extraRecurringCostCents +
    (extraCostApplies(assumptions, m) ? assumptions.extraOneOffCostCents : 0);

  return { revenue, costs };
}
