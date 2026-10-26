export type Frequency = 'monthly' | 'one_off';
export type ScenarioKind = 'base' | 'cautious' | 'growth' | 'custom';
export type MonthValue = string;

export interface CashFlowItem {
  id?: string;
  name: string;
  amountCents: number;
  frequency: Frequency;
  startMonth: MonthValue;
}

export type RevenueItem = CashFlowItem;
export type ExpenseItem = CashFlowItem;

export interface ScenarioAssumptions {
  revenueGrowthPct: number;
  priceChangePct: number;
  revenueLossPct: number;
  extraRecurringCostCents: number;
  extraOneOffCostCents: number;
  extraOneOffMonth: MonthValue | number | null;
}

export interface MonthRow {
  month: MonthValue;
  monthIndex: number;
  revenueCents: number;
  costsCents: number;
  netCashFlowCents: number;
  closingBalanceCents: number;
}

export type RunwayDisplay = number | 'cash-flow positive' | `more than ${number} months`;

export interface RunwayResult {
  netBurnCents: number;
  simpleRunwayMonths: number | null;
  projectionRunwayMonths: number | null;
  display: RunwayDisplay;
  isCashFlowPositive: boolean;
}

export function formatMoney(cents: number, currency: string): string {
  if (!Number.isInteger(cents)) {
    throw new Error('Money must be represented in whole cents.');
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function parseMoneyToCents(text: string): number {
  const trimmed = text.trim();
  const withoutCurrency = trimmed
    .replace(/,/g, '')
    .replace(/^[A-Za-z]{3}\s*/, '')
    .replace(/^[\$€£¥]\s*/, '');
  const match = withoutCurrency.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`Invalid money amount: ${text}`);
  }

  const [, sign, whole, fraction = ''] = match;
  const cents = Number(`${whole}${fraction.padEnd(2, '0')}`);
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Money amount is too large: ${text}`);
  }

  return sign === '-' ? -cents : cents;
}
