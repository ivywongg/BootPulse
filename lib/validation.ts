import { z } from 'zod';
import { parseMoneyToCents } from './calc/types';

export const entityIdSchema = z.string().trim().regex(
  /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i,
  'Invalid identifier.',
);

export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date.');

export const monthDateSchema = calendarDateSchema.transform((value) => `${value.slice(0, 7)}-01`);
export const monthFilterSchema = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Use YYYY-MM.');

// Amounts are stored in 32-bit integer cents.
export const MAX_MONEY_CENTS = 2_000_000_000;

export const moneyTextSchema = z.string().trim().min(1).max(64).refine((value) => {
  try {
    const cents = parseMoneyToCents(value);
    return Number.isSafeInteger(cents) && cents >= 0 && cents <= MAX_MONEY_CENTS;
  } catch {
    return false;
  }
}, 'Use a money value from 0 to 20,000,000 with at most two decimal places.');

export const moneyCentsSchema = z.preprocess(
  (value) => typeof value === 'number' && Number.isFinite(value) ? String(value) : value,
  moneyTextSchema,
).transform(parseMoneyToCents);
