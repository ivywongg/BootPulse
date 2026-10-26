import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  all: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
  getActiveBusiness: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  loadForecast: vi.fn(),
  requireBusinessAccess: vi.fn(),
  select: vi.fn(),
  where: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({ eq: mocks.eq }));
vi.mock('../db', () => ({ db: { select: mocks.select } }));
vi.mock('../db/schema', () => ({
  expenseItems: {
    amountCents: 'expense_amount_cents',
    businessId: 'expense_business_id',
    categoryId: 'expense_category_id',
    frequency: 'expense_frequency',
    name: 'expense_name',
    startMonth: 'expense_start_month',
  },
  revenueItems: {
    amountCents: 'revenue_amount_cents',
    businessId: 'revenue_business_id',
    categoryId: 'revenue_category_id',
    frequency: 'revenue_frequency',
    name: 'revenue_name',
    startMonth: 'revenue_start_month',
  },
}));
vi.mock('./access', () => ({
  getActiveBusiness: mocks.getActiveBusiness,
  requireBusinessAccess: mocks.requireBusinessAccess,
}));
vi.mock('./auth', () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }));
vi.mock('./forecast', () => ({ loadForecast: mocks.loadForecast }));

import { GET } from '../app/api/export/route';

const businessId = '0123456789abcdef0123456789abcdef';

function exportRequest(query: string) {
  return new NextRequest(`http://bootpulse.test/api/export?${query}`);
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.getAuthenticatedUser.mockResolvedValue({ id: 'verified-user-id' });
  mocks.getActiveBusiness.mockResolvedValue({ id: businessId });
  mocks.eq.mockReturnValue('ownership-condition');
  mocks.all.mockReturnValue([]);
  mocks.where.mockReturnValue({ all: mocks.all });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.select.mockReturnValue({ from: mocks.from });
});

describe('export route security', () => {
  it('returns 401 without a verified authenticated user before processing the query', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const response = await GET(exportRequest('type=cash-flow'));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized.');
    expect(mocks.getActiveBusiness).not.toHaveBeenCalled();
    expect(mocks.requireBusinessAccess).not.toHaveBeenCalled();
  });

  it.each([
    'type=unknown',
    'type=revenue&type=expenses',
    'type=revenue&extra=value',
    'type=revenue&businessId=not-an-entity-id',
    `type=revenue&businessId=${'a'.repeat(257)}`,
  ])('returns 400 for an invalid export query: %s', async (query) => {
    const response = await GET(exportRequest(query));

    expect(response.status).toBe(400);
    expect(mocks.getActiveBusiness).not.toHaveBeenCalled();
    expect(mocks.requireBusinessAccess).not.toHaveBeenCalled();
  });

  it('escapes formula-like text and CR characters while preserving numeric cents', async () => {
    mocks.all.mockReturnValue([
      {
        name: '=SUM(1,1)',
        amountCents: 12_345,
        frequency: 'monthly',
        startMonth: '2026-01-01',
        categoryId: '=category',
      },
      {
        name: 'Line\rbreak',
        amountCents: 678,
        frequency: 'one_off',
        startMonth: '2026-02-01',
        categoryId: null,
      },
    ]);

    const response = await GET(exportRequest(`type=revenue&businessId=${businessId}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="bootpulse-revenue.csv"');
    expect(await response.text()).toBe([
      'name,amount_cents,frequency,start_month,category_id',
      '"\'=SUM(1,1)",12345,monthly,2026-01-01,\'=category',
      '"Line\rbreak",678,one_off,2026-02-01,',
      '',
    ].join('\n'));
    expect(mocks.requireBusinessAccess).toHaveBeenCalledWith('verified-user-id', businessId);
  });

  it('keeps negative cash-flow cents and balances numeric', async () => {
    mocks.loadForecast.mockResolvedValue({
      rows: [{
        month: '2026-01-01',
        revenueCents: 500,
        costsCents: 1_400,
        netCashFlowCents: -900,
        closingBalanceCents: -800,
      }],
    });

    const response = await GET(exportRequest('type=cash-flow'));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('2026-01-01,500,1400,-900,-800\n');
    expect(mocks.loadForecast).toHaveBeenCalledWith(businessId);
  });
});
