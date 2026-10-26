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
const itemTables = { revenue: revenueItems, expense: expenseItems } as const;

const itemInputSchema = z.object({
  businessId: entityIdSchema,
  name: z.string().trim().min(1).max(120),
  amount: moneyTextSchema,
  categoryId: entityIdSchema.nullable().optional(),
  frequency: z.enum(['monthly', 'one_off']),
  startMonth: monthDateSchema,
});

export type ItemInput = z.input<typeof itemInputSchema>;

type ValidationError = { error: string };

function validationError(error: z.ZodError): ValidationError {
  return { error: error.issues
      .map((issue) => {
        const field = issue.path.join('.');
        return field ? `${field.charAt(0).toUpperCase()}${field.slice(1)}: ${issue.message}` : issue.message;
      })
      .join(' ') };
}

async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Authentication required.');
  return user;
}

/** Validates the form values and checks the caller may edit this business (owner or collaborator). */
async function prepareValues(input: unknown) {
  const result = itemInputSchema.safeParse(input);
  if (!result.success) return validationError(result.error);
  const parsed = result.data;
  const user = await requireUser();
  await requireBusinessAccess(user.id, parsed.businessId);

  if (parsed.categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, parsed.categoryId), eq(categories.businessId, parsed.businessId)))
      .limit(1);
    if (!category) throw new Error('Category does not belong to this business.');
  }

  return {
    businessId: parsed.businessId,
    name: parsed.name,
    categoryId: parsed.categoryId ?? null,
    frequency: parsed.frequency,
    startMonth: parsed.startMonth,
    amountCents: parseMoneyToCents(parsed.amount),
  };
}

export async function addItem(kind: ItemKind, input: ItemInput) {
  const parsedKind = itemKindSchema.safeParse(kind);
  if (!parsedKind.success) return validationError(parsedKind.error);
  const values = await prepareValues(input);
  if ('error' in values) return values;
  const [created] = await db.insert(itemTables[parsedKind.data]).values(values).returning();
  return created;
}

export async function updateItem(kind: ItemKind, itemId: string, input: ItemInput) {
  const parsed = z.object({ kind: itemKindSchema, itemId: entityIdSchema }).safeParse({ kind, itemId });
  if (!parsed.success) return validationError(parsed.error);
  const values = await prepareValues(input);
  if ('error' in values) return values;
  const table = itemTables[parsed.data.kind];
  const [updated] = await db
    .update(table)
    .set(values)
    .where(and(eq(table.id, parsed.data.itemId), eq(table.businessId, values.businessId)))
    .returning();
  if (!updated) throw new Error('Item not found.');
  return updated;
}

export async function deleteItem(kind: ItemKind, itemId: string, businessId: string) {
  const parsed = z
    .object({ kind: itemKindSchema, itemId: entityIdSchema, businessId: entityIdSchema })
    .safeParse({ kind, itemId, businessId });
  if (!parsed.success) return validationError(parsed.error);
  const user = await requireUser();
  await requireBusinessAccess(user.id, parsed.data.businessId);
  const table = itemTables[parsed.data.kind];
  const [deleted] = await db
    .delete(table)
    .where(and(eq(table.id, parsed.data.itemId), eq(table.businessId, parsed.data.businessId)))
    .returning();
  return deleted;
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
