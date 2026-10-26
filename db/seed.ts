import { eq } from 'drizzle-orm';
import { db, type Db } from './index';
import {
  businesses,
  categories,
  decisions,
  expenseItems,
  milestones,
  revenueItems,
  scenarios,
  teamMembers,
  users,
} from './schema';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Default categories and the three preset scenarios every business starts with. */
export async function seedBusinessDefaults(tx: Tx, businessId: string) {
  const rows = await tx
    .insert(categories)
    .values([
      { businessId, name: 'Product sales', kind: 'revenue' },
      { businessId, name: 'Services', kind: 'revenue' },
      { businessId, name: 'Other income', kind: 'revenue' },
      { businessId, name: 'Contractors', kind: 'expense' },
      { businessId, name: 'Software and tools', kind: 'expense' },
      { businessId, name: 'Marketing', kind: 'expense' },
      { businessId, name: 'Other costs', kind: 'expense' },
    ])
    .returning();
  await tx.insert(scenarios).values([
    { businessId, name: 'Base', kind: 'base' },
    { businessId, name: 'Cautious', kind: 'cautious', revenueLossPct: 10, extraRecurringCostCents: 20_000 },
    { businessId, name: 'Growth', kind: 'growth', revenueGrowthPct: 4, extraRecurringCostCents: 30_000 },
  ]);
  return rows;
}

/** Fictional demo business: USD 10,000 cash, USD 5,000 revenue and USD 7,000 costs per month. */
export async function createDemoBusiness(tx: Tx, userId: string) {
  const start = monthStart();
  const startText = isoDate(start);
  const [business] = await tx
    .insert(businesses)
    .values({ name: 'Demo: Harbour Studio (fictional)', currency: 'USD', cashStartMonth: startText, cashBalanceCents: 1_000_000, isDemo: true })
    .returning();
  await tx.insert(teamMembers).values({ businessId: business.id, userId, role: 'owner' });
  const cats = await seedBusinessDefaults(tx, business.id);
  const category = (name: string) => cats.find((row) => row.name === name)?.id ?? null;

  await tx.insert(revenueItems).values([
    { businessId: business.id, categoryId: category('Product sales'), name: 'Product sales', amountCents: 300_000, frequency: 'monthly', startMonth: startText },
    { businessId: business.id, categoryId: category('Services'), name: 'Service revenue', amountCents: 200_000, frequency: 'monthly', startMonth: startText },
  ]);
  await tx.insert(expenseItems).values([
    { businessId: business.id, categoryId: category('Contractors'), name: 'Contractors', amountCents: 400_000, frequency: 'monthly', startMonth: startText },
    { businessId: business.id, categoryId: category('Software and tools'), name: 'Software and tools', amountCents: 300_000, frequency: 'monthly', startMonth: startText },
  ]);
  await tx.insert(milestones).values({
    businessId: business.id,
    title: 'Reach sustainable monthly revenue',
    targetDate: isoDate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1))),
    status: 'planned',
  });
  await tx.insert(decisions).values({
    businessId: business.id,
    title: 'Review contractor budget',
    decidedOn: startText,
    expectedImpact: 'Keep the monthly cost base visible and controlled.',
  });
  return business;
}

// Manual use: npm run db:seed -- <existing-user-uuid> adds another demo business for that user.
async function main() {
  const userId = process.argv[2];
  if (!userId) throw new Error('Usage: npm run db:seed -- <user-id>');
  const business = await db.transaction(async (tx) => {
    const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('No such user. Create an account first.');
    return createDemoBusiness(tx, userId);
  });
  console.log(`Demo business created: ${business.name} (${business.id})`);
}

if (process.argv[1]?.split('\\').join('/').endsWith('db/seed.ts')) {
  main().then(() => process.exit(0), (error) => {
    console.error(error);
    process.exit(1);
  });
}
