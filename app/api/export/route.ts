import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '../../../db';
import { categories, expenseItems, revenueItems } from '../../../db/schema';
import { getActiveBusiness, requireBusinessAccess } from '../../../lib/access';
import { getAuthenticatedUser } from '../../../lib/auth';
import { loadForecast } from '../../../lib/forecast';
import { entityIdSchema } from '../../../lib/validation';

function csvCell(value: unknown) {
  if (typeof value === 'number') return String(value);

  const text = value == null ? '' : String(value);
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replace(/"/g, '""')}"` : safeText;
}

function csvResponse(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  return new Response(`${csv}\n`, {
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'text/csv; charset=utf-8',
    },
  });
}

const exportQuerySchema = z.object({
  type: z.enum(['cash-flow', 'revenue', 'expenses']),
  businessId: entityIdSchema.optional(),
}).strict();
const MAX_EXPORT_QUERY_LENGTH = 256;

function parseExportQuery(request: NextRequest) {
  if (request.nextUrl.search.length > MAX_EXPORT_QUERY_LENGTH) return null;

  const searchParams = request.nextUrl.searchParams;
  const allowedKeys = new Set(['type', 'businessId']);

  for (const [key] of searchParams) {
    if (!allowedKeys.has(key) || searchParams.getAll(key).length !== 1) {
      return null;
    }
  }

  const result = exportQuerySchema.safeParse(Object.fromEntries(searchParams));
  return result.success ? result.data : null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new Response('Unauthorized.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const query = parseExportQuery(request);
  if (!query) {
    return new Response('Invalid export query.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const activeBusiness = await getActiveBusiness(user.id);
  const requestedBusinessId = query.businessId ?? activeBusiness.id;
  const { type } = query;

  await requireBusinessAccess(user.id, requestedBusinessId);

  if (type === 'cash-flow') {
    const forecast = await loadForecast(requestedBusinessId);
    return csvResponse(
      'bootpulse-cash-flow.csv',
      ['month', 'revenue_cents', 'costs_cents', 'net_cents', 'closing_balance_cents'],
      forecast.rows.map((row) => [
        row.month,
        row.revenueCents,
        row.costsCents,
        row.netCashFlowCents,
        row.closingBalanceCents,
      ]),
    );
  }

  if (type === 'revenue' || type === 'expenses') {
    const table = type === 'revenue' ? revenueItems : expenseItems;
    const items = await db
      .select({
        name: table.name,
        amountCents: table.amountCents,
        frequency: table.frequency,
        startMonth: table.startMonth,
        category: categories.name,
      })
      .from(table)
      .leftJoin(categories, eq(categories.id, table.categoryId))
      .where(eq(table.businessId, requestedBusinessId))
      .orderBy(table.startMonth, table.name);

    return csvResponse(
      `bootpulse-${type}.csv`,
      ['name', 'amount_cents', 'frequency', 'start_month', 'category'],
      items.map((item) => [
        item.name,
        item.amountCents,
        item.frequency,
        item.startMonth,
        item.category,
      ]),
    );
  }
  return new Response('Invalid export query.', { status: 400 });
}
