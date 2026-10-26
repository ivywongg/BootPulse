import { describe, expect, it } from 'vitest';
import { addMonths, monthKey } from './monthly';
import { projectMonths } from './projection';
import { getRunway } from './runway';
import { applyAssumptions, roundCents } from './scenario';
import { getWarnings } from './warnings';
import type { CashFlowItem, ScenarioAssumptions } from './types';

const none: ScenarioAssumptions = {
  revenueGrowthPct: 0,
  priceChangePct: 0,
  revenueLossPct: 0,
  extraRecurringCostCents: 0,
  extraOneOffCostCents: 0,
  extraOneOffMonth: null,
};

const monthly = (amountCents: number, startMonth = '2026-01-01'): CashFlowItem => ({ name: 'x', amountCents, frequency: 'monthly', startMonth });
const oneOff = (amountCents: number, startMonth: string): CashFlowItem => ({ name: 'x', amountCents, frequency: 'one_off', startMonth });

function run(cash: number, revenue: CashFlowItem[], expenses: CashFlowItem[], assumptions = none, months = 24, startMonth = '2026-01-01') {
  const rows = projectMonths({ cash, items: { revenue, expenses }, assumptions, months, startMonth });
  return { rows, runway: getRunway({ cash, projection: rows }) };
}

describe('month handling', () => {
  it('rolls over year boundaries and normalises any day to the first of the month', () => {
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
    expect(monthKey('2026-02-28')).toBe('2026-02');
    const { rows } = run(0, [monthly(1)], [], none, 3, '2026-11-20');
    expect(rows.map((row) => row.month)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });

  it('counts a one-off only in its own month and a recurring item from its start month', () => {
    const { rows } = run(0, [monthly(100, '2026-03-01'), oneOff(50, '2026-02-17')], [], none, 4);
    expect(rows.map((row) => row.revenueCents)).toEqual([0, 50, 100, 100]);
  });

  it('counts recurring items that began before the forecast start but ignores earlier one-offs', () => {
    const { rows } = run(0, [monthly(100, '2025-06-01'), oneOff(999, '2025-12-01')], [], none, 2);
    expect(rows.map((row) => row.revenueCents)).toEqual([100, 100]);
  });
});

describe('runway definitions', () => {
  it('treats exactly zero as still funded and the first negative month as the end', () => {
    const { rows, runway } = run(1_000_000, [monthly(500_000)], [monthly(700_000)]);
    expect(rows[4].closingBalanceCents).toBe(0);
    expect(rows[5].closingBalanceCents).toBe(-200_000);
    expect(runway.projectionRunwayMonths).toBe(5);
    expect(runway.simpleRunwayMonths).toBe(5);
  });

  it('reports zero runway when opening cash is already negative or month 1 overdraws', () => {
    expect(run(-1, [], []).runway.display).toBe(0);
    expect(run(100, [], [monthly(101)]).runway.display).toBe(0);
  });

  it('reports cash-flow positive only for zero burn, including break-even', () => {
    expect(run(0, [monthly(700_000)], [monthly(700_000)]).runway).toMatchObject({ display: 'cash-flow positive', netBurnCents: 0 });
    expect(run(0, [], []).runway.display).toBe('cash-flow positive');
  });

  it('reports “more than N months” at the forecast limit, using the plan horizon', () => {
    expect(run(1_000_000, [], [monthly(100_000)], none, 6).runway.display).toBe('more than 6 months');
    expect(run(1_000_000, [], [monthly(100_000)], none, 24).runway.display).toBe(10);
  });

  it('reads later cost rises from the projection even when month 1 has zero burn', () => {
    const { runway } = run(100_000, [monthly(100_000)], [monthly(100_000), monthly(300_000, '2026-03-01')]);
    expect(runway.netBurnCents).toBe(0);
    expect(runway.display).toBe(2);
  });
});

describe('scenario arithmetic and rounding', () => {
  it('rounds halves away from zero and removes float noise', () => {
    expect(roundCents(2.5)).toBe(3);
    expect(roundCents(-2.5)).toBe(-3);
    expect(roundCents(-0.4)).toBe(-0);
    expect(roundCents(99000.00000000001)).toBe(99000);
    expect(roundCents(1.005 * 100)).toBe(101);
  });

  it('compounds growth from forecast month 1 and applies price and loss factors', () => {
    expect(applyAssumptions(100_000, 0, { ...none, revenueGrowthPct: 4 }, 1).revenue).toBe(100_000);
    expect(applyAssumptions(100_000, 0, { ...none, revenueGrowthPct: 4 }, 3).revenue).toBe(108_160);
    expect(applyAssumptions(100_000, 0, { ...none, priceChangePct: 10, revenueLossPct: 10 }, 1).revenue).toBe(99_000);
    expect(applyAssumptions(333, 0, { ...none, revenueLossPct: 50 }, 1).revenue).toBe(167);
  });

  it('applies the extra one-off cost only in its month, matched by calendar month', () => {
    const { rows } = run(1_000_000, [monthly(500_000)], [monthly(700_000)], { ...none, extraOneOffCostCents: 600_000, extraOneOffMonth: '2026-03-09' });
    expect(rows.map((row) => row.costsCents).slice(0, 4)).toEqual([700_000, 700_000, 1_300_000, 700_000]);
    expect(rows[2].closingBalanceCents).toBe(-200_000);
  });

  it('keeps negative projected balances exact integers through cautious-case compounding', () => {
    const { rows, runway } = run(1_000_000, [monthly(500_000)], [monthly(700_000)], { ...none, revenueLossPct: 10, extraRecurringCostCents: 20_000 });
    expect(rows.every((row) => Number.isInteger(row.closingBalanceCents) && Number.isInteger(row.netCashFlowCents))).toBe(true);
    expect(runway.display).toBe(3);
    expect(rows[3].closingBalanceCents).toBeLessThan(0);
  });
});

describe('warnings', () => {
  it('uses the 10% thresholds inclusively and the runway bands', () => {
    const rising = run(100_000_000, [monthly(100)], [monthly(1000), monthly(100, '2026-04-01')]);
    expect(getWarnings(rising.rows, rising.runway).map((warning) => warning.type)).toContain('rising_costs');
    const falling = run(100_000_000, [monthly(1000)], [monthly(1)], { ...none, revenueGrowthPct: -3.5 });
    expect(getWarnings(falling.rows, falling.runway).map((warning) => warning.type)).toContain('falling_revenue');
    const critical = run(100, [], [monthly(100)]);
    expect(getWarnings(critical.rows, critical.runway)[0]).toMatchObject({ type: 'runway_risk', severity: 'critical' });
  });
});
