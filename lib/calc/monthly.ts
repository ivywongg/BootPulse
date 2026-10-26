import type { CashFlowItem, MonthValue } from './types';

function parseMonth(month: MonthValue) {
  const match = month.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) {
    throw new Error(`Invalid month: ${month}`);
  }

  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new Error(`Invalid month: ${month}`);
  }

  return { year, monthNumber };
}

export function monthStart(month: MonthValue): MonthValue {
  const { year, monthNumber } = parseMonth(month);
  return `${year.toString().padStart(4, '0')}-${monthNumber.toString().padStart(2, '0')}-01`;
}

export function monthKey(month: MonthValue): string {
  return monthStart(month).slice(0, 7);
}

export function addMonths(month: MonthValue, offset: number): MonthValue {
  if (!Number.isInteger(offset)) {
    throw new Error('Month offset must be an integer.');
  }

  const { year, monthNumber } = parseMonth(month);
  const zeroBasedMonth = year * 12 + (monthNumber - 1) + offset;
  const nextYear = Math.floor(zeroBasedMonth / 12);
  const nextMonth = ((zeroBasedMonth % 12) + 12) % 12 + 1;
  return `${nextYear.toString().padStart(4, '0')}-${nextMonth.toString().padStart(2, '0')}-01`;
}

export function isItemActiveInMonth(item: CashFlowItem, month: MonthValue): boolean {
  const itemMonth = monthKey(item.startMonth);
  const targetMonth = monthKey(month);

  if (item.frequency === 'one_off') {
    return itemMonth === targetMonth;
  }

  return targetMonth >= itemMonth;
}

export function monthlyTotals(items: readonly CashFlowItem[], month: MonthValue): number {
  return items.reduce(
    (total, item) => (isItemActiveInMonth(item, month) ? total + item.amountCents : total),
    0,
  );
}
