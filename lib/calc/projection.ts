import { addMonths, monthKey, monthlyTotals } from './monthly';
import { applyAssumptions } from './scenario';
import type { CashFlowItem, MonthRow, ScenarioAssumptions } from './types';

type ProjectionItems =
  | {
      revenue: readonly CashFlowItem[];
      expenses: readonly CashFlowItem[];
    }
  | {
      revenueItems: readonly CashFlowItem[];
      expenseItems: readonly CashFlowItem[];
    };

export interface ProjectMonthsInput {
  cash: number;
  items: ProjectionItems;
  assumptions: ScenarioAssumptions;
  months: number;
  startMonth: string;
}

function getRevenueItems(items: ProjectionItems) {
  return 'revenue' in items ? items.revenue : items.revenueItems;
}

function getExpenseItems(items: ProjectionItems) {
  return 'expenses' in items ? items.expenses : items.expenseItems;
}

function oneOffMonthIndex(
  assumptions: ScenarioAssumptions,
  month: string,
  monthIndex: number,
): number | null {
  if (assumptions.extraOneOffMonth === null) {
    return null;
  }

  if (typeof assumptions.extraOneOffMonth === 'number') {
    return assumptions.extraOneOffMonth === monthIndex ? monthIndex : null;
  }

  return monthKey(assumptions.extraOneOffMonth) === monthKey(month) ? monthIndex : null;
}

export function projectMonths({
  cash,
  items,
  assumptions,
  months,
  startMonth,
}: ProjectMonthsInput): MonthRow[] {
  if (!Number.isInteger(months) || months < 0) {
    throw new Error('Projection length must be a non-negative integer.');
  }

  const revenueItems = getRevenueItems(items);
  const expenseItems = getExpenseItems(items);
  let closingBalanceCents = cash;
  const rows: MonthRow[] = [];

  for (let monthIndex = 1; monthIndex <= months; monthIndex += 1) {
    const month = addMonths(startMonth, monthIndex - 1);
    const baseRevenue = monthlyTotals(revenueItems, month);
    const baseCosts = monthlyTotals(expenseItems, month);
    const monthAssumptions = {
      ...assumptions,
      extraOneOffMonth: oneOffMonthIndex(assumptions, month, monthIndex),
    };
    const totals = applyAssumptions(baseRevenue, baseCosts, monthAssumptions, monthIndex);
    const netCashFlowCents = totals.revenue - totals.costs;
    closingBalanceCents += netCashFlowCents;

    rows.push({
      month,
      monthIndex,
      revenueCents: totals.revenue,
      costsCents: totals.costs,
      netCashFlowCents,
      closingBalanceCents,
    });
  }

  return rows;
}
