import { describe, expect, it } from 'vitest';
import { projectMonths } from './projection';
import { getRunway } from './runway';
import { getWarnings } from './warnings';
import type { CashFlowItem, ScenarioAssumptions } from './types';

const baseAssumptions: ScenarioAssumptions = {
  revenueGrowthPct: 0,
  priceChangePct: 0,
  revenueLossPct: 0,
  extraRecurringCostCents: 0,
  extraOneOffCostCents: 0,
  extraOneOffMonth: null,
};

const baseItems: { revenue: CashFlowItem[]; expenses: CashFlowItem[] } = {
  revenue: [
    {
      name: 'Monthly revenue',
      amountCents: 500_000,
      frequency: 'monthly',
      startMonth: '2026-01-01',
    },
  ],
  expenses: [
    {
      name: 'Monthly costs',
      amountCents: 700_000,
      frequency: 'monthly',
      startMonth: '2026-01-01',
    },
  ],
};

function projection(assumptions = baseAssumptions, months = 24) {
  return projectMonths({
    cash: 1_000_000,
    items: baseItems,
    assumptions,
    months,
    startMonth: '2026-01-01',
  });
}

describe('BootPulse calculation formula gate', () => {
  it('calculates USD 2,000 net burn and 5.0 months runway', () => {
    const rows = projection();
    const runway = getRunway({ cash: 1_000_000, projection: rows });

    expect(runway.netBurnCents).toBe(200_000);
    expect(runway.simpleRunwayMonths).toBe(5);
    expect(runway.projectionRunwayMonths).toBe(5);
    expect(runway.display).toBe(5);
  });

  it('reports cash-flow positive when revenue exceeds costs', () => {
    const rows = projectMonths({
      cash: 1_000_000,
      items: {
        revenue: [{ ...baseItems.revenue[0], amountCents: 800_000 }],
        expenses: baseItems.expenses,
      },
      assumptions: baseAssumptions,
      months: 6,
      startMonth: '2026-01-01',
    });

    const runway = getRunway({ cash: 1_000_000, projection: rows });
    expect(runway.netBurnCents).toBe(0);
    expect(runway.display).toBe('cash-flow positive');
  });

  it('finds the first negative balance in month 3 after a one-off cost', () => {
    const rows = projection({
      ...baseAssumptions,
      extraOneOffCostCents: 600_000,
      extraOneOffMonth: '2026-03-01',
    }, 6);
    const runway = getRunway({ cash: 1_000_000, projection: rows });

    expect(rows[2].closingBalanceCents).toBe(-200_000);
    expect(runway.projectionRunwayMonths).toBe(2);
    expect(runway.display).toBe(2);
  });

  it('gives the cautious preset three months of runway', () => {
    const rows = projection({
      ...baseAssumptions,
      revenueLossPct: 10,
      extraRecurringCostCents: 20_000,
    }, 6);
    const runway = getRunway({ cash: 1_000_000, projection: rows });

    expect(runway.netBurnCents).toBe(270_000);
    expect(runway.projectionRunwayMonths).toBe(3);
  });

  it('matches simple and projection runway when monthly figures are flat', () => {
    const runway = getRunway({ cash: 1_000_000, projection: projection() });
    expect(runway.simpleRunwayMonths).toBe(runway.projectionRunwayMonths);
  });

  it('emits the three threshold warnings when each rule is triggered', () => {
    const rows = [1, 2, 3, 4].map((monthIndex) => ({
      month: `2026-0${monthIndex}-01`,
      monthIndex,
      revenueCents: monthIndex === 4 ? 900_000 : 1_000_000,
      costsCents: monthIndex === 4 ? 1_100_000 : 1_000_000,
      netCashFlowCents: 0,
      closingBalanceCents: 100_000,
    }));
    const warnings = getWarnings(rows, {
      netBurnCents: 200_000,
      simpleRunwayMonths: 5,
      projectionRunwayMonths: 5,
      display: 5,
      isCashFlowPositive: false,
    });

    expect(warnings.map((warning) => warning.type)).toEqual([
      'runway_risk',
      'rising_costs',
      'falling_revenue',
    ]);
  });
});
