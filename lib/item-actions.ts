'use server';

import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { categories, expenseItems, revenueItems } from '../db/schema';
import { requireBusinessAccess } from './access';
import { getAuthenticatedUser } from './auth';
import { parseMoneyToCents } from './calc/types';
import { entityIdSchema, moneyTextSchema, monthDateSchema } from './validation';

export type ItemKind = 'revenue' | 'expense';

const itemKindSchema = z.enum(['revenue', 'expense']);

const itemInputSchema = z.object({
  businessId: entityIdSchema,
  name: z.string().trim().min(1).max(120),
  amount: moneyTextSchema,
  categoryId: entityIdSchema.nullable().optional(),
  frequency: z.enum(['monthly', 'one_off']),
  startMonth: monthDateSchema,
});

export type ItemInput = z.input<typeof itemInputSchema>;

type ValidatedItemInput = Omit<z.output<typeof itemInputSchema>, 'categoryId' | 'amount'> & {
  categoryId: string | null;
  amountCents: number;
};

type ValidationError = { error: string };

function validationError(error: z.ZodError): ValidationError {
  return {
    error: error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' '),
  };
}

function validateItemInput(input: unknown): ValidatedItemInput | ValidationError {
  const result = itemInputSchema.safeParse(input);
  if (!result.success) {
    return validationError(result.error);
  }

  const parsed = result.data;

  return {
    businessId: parsed.businessId,
    name: parsed.name,
    categoryId: parsed.categoryId ?? null,
    frequency: parsed.frequency,
    startMonth: parsed.startMonth,
    amountCents: parseMoneyToCents(parsed.amount),
  };
}

async function assertItemAccess(input: ValidatedItemInput) {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Authentication required.');
  }

  requireBusinessAccess(user.id, input.businessId);

  if (input.categoryId) {
    const category = db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, input.categoryId), eq(categories.businessId, input.businessId)),
      )
      .get();
    if (!category) {
      throw new Error('Category does not belong to this business.');
    }
  }
}

export async function addItem(kind: ItemKind, input: ItemInput) {
  const parsedKind = itemKindSchema.safeParse(kind);
  if (!parsedKind.success) return validationError(parsedKind.error);

  const validated = validateItemInput(input);
  if ('error' in validated) return validated;
  await assertItemAccess(validated);

  if (parsedKind.data === 'revenue') {
    return db.insert(revenueItems).values(validated).returning().get();
  }

  return db.insert(expenseItems).values(validated).returning().get();
}

export async function updateItem(kind: ItemKind, itemId: string, input: ItemInput) {
  const parsedAction = z
    .object({ kind: itemKindSchema, itemId: entityIdSchema })
    .safeParse({ kind, itemId });
  if (!parsedAction.success) return validationError(parsedAction.error);

  const validated = validateItemInput(input);
  if ('error' in validated) return validated;
  await assertItemAccess(validated);

  if (parsedAction.data.kind === 'revenue') {
    const existing = db
      .select({ id: revenueItems.id })
      .from(revenueItems)
      .where(
        and(
          eq(revenueItems.id, parsedAction.data.itemId),
          eq(revenueItems.businessId, validated.businessId),
        ),
      )
      .get();
    if (!existing) throw new Error('Revenue item not found.');
    return db
      .update(revenueItems)
      .set(validated)
      .where(
        and(
          eq(revenueItems.id, parsedAction.data.itemId),
          eq(revenueItems.businessId, validated.businessId),
        ),
      )
      .returning()
      .get();
  }

  const existing = db
    .select({ id: expenseItems.id })
    .from(expenseItems)
    .where(
      and(
        eq(expenseItems.id, parsedAction.data.itemId),
        eq(expenseItems.businessId, validated.businessId),
      ),
    )
    .get();
  if (!existing) throw new Error('Expense item not found.');
  return db
    .update(expenseItems)
    .set(validated)
    .where(
      and(
        eq(expenseItems.id, parsedAction.data.itemId),
        eq(expenseItems.businessId, validated.businessId),
      ),
    )
    .returning()
    .get();
}

export async function deleteItem(kind: ItemKind, itemId: string, businessId: string) {
  const parsedAction = z
    .object({ kind: itemKindSchema, itemId: entityIdSchema, businessId: entityIdSchema })
    .safeParse({ kind, itemId, businessId });
  if (!parsedAction.success) return validationError(parsedAction.error);

  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Authentication required.');
  }

  requireBusinessAccess(user.id, parsedAction.data.businessId);

  if (parsedAction.data.kind === 'revenue') {
    return db
      .delete(revenueItems)
      .where(
        and(
          eq(revenueItems.id, parsedAction.data.itemId),
          eq(revenueItems.businessId, parsedAction.data.businessId),
        ),
      )
      .returning()
      .get();
  }

  return db
    .delete(expenseItems)
    .where(
      and(
        eq(expenseItems.id, parsedAction.data.itemId),
        eq(expenseItems.businessId, parsedAction.data.businessId),
      ),
    )
    .returning()
    .get();
}

export async function addRevenueItem(input: ItemInput) {
  return addItem('revenue', input);
}

export async function updateRevenueItem(itemId: string, input: ItemInput) {
  return updateItem('revenue', itemId, input);
}

export async function deleteRevenueItem(itemId: string, businessId: string) {
  return deleteItem('revenue', itemId, businessId);
}

export async function addExpenseItem(input: ItemInput) {
  return addItem('expense', input);
}

export async function updateExpenseItem(itemId: string, input: ItemInput) {
  return updateItem('expense', itemId, input);
}

export async function deleteExpenseItem(itemId: string, businessId: string) {
  return deleteItem('expense', itemId, businessId);
}
