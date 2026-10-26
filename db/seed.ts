import { eq, sql } from 'drizzle-orm';
import { db } from './index';
import {
  businesses,
  categories,
  decisions,
  expenseItems,
  milestones,
  scenarios,
  subscriptions,
  teamMembers,
  users,
  revenueItems,
} from './schema';

const DEMO_USER_ID = 'seed_demo_user';
const CONSENT_VERSION = 'PICS-v1';

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createDemoBusiness(userId: string) {
  db.run(sql`PRAGMA foreign_keys = ON`);

  return db.transaction((tx) => {
    let user = tx.select().from(users).where(eq(users.clerkUserId, userId)).get();
    if (!user) {
      user = tx
        .insert(users)
        .values({
          clerkUserId: userId,
          privacyConsentAt: new Date(),
          consentVersion: CONSENT_VERSION,
        })
        .returning()
        .get();
    }

    const existingBusiness = tx
      .select({ business: businesses })
      .from(businesses)
      .innerJoin(teamMembers, eq(teamMembers.businessId, businesses.id))
      .where(
        sql`${teamMembers.userId} = ${user.id} and ${teamMembers.role} = 'owner' and ${businesses.isDemo} = 1`,
      )
      .get();

    if (existingBusiness) {
      return existingBusiness.business;
    }

    const startMonth = monthStart();
    const startMonthText = isoDate(startMonth);
    const business = tx
      .insert(businesses)
      .values({
        name: 'BootPulse Demo Business',
        currency: 'USD',
        cashStartMonth: startMonthText,
        cashBalanceCents: 1_000_000,
        isDemo: true,
      })
      .returning()
      .get();

    tx.insert(teamMembers)
      .values({ businessId: business.id, userId: user.id, role: 'owner' })
      .run();

    const [revenueCategory, expenseCategory] = tx
      .insert(categories)
      .values([
        { businessId: business.id, name: 'Sales', kind: 'revenue' },
        { businessId: business.id, name: 'Operating costs', kind: 'expense' },
      ])
      .returning()
      .all();

    tx.insert(revenueItems)
      .values([
        {
          businessId: business.id,
          categoryId: revenueCategory.id,
          name: 'Product sales',
          amountCents: 300_000,
          frequency: 'monthly',
          startMonth: startMonthText,
        },
        {
          businessId: business.id,
          categoryId: revenueCategory.id,
          name: 'Service revenue',
          amountCents: 200_000,
          frequency: 'monthly',
          startMonth: startMonthText,
        },
      ])
      .run();

    tx.insert(expenseItems)
      .values([
        {
          businessId: business.id,
          categoryId: expenseCategory.id,
          name: 'Contractors',
          amountCents: 400_000,
          frequency: 'monthly',
          startMonth: startMonthText,
        },
        {
          businessId: business.id,
          categoryId: expenseCategory.id,
          name: 'Software and tools',
          amountCents: 300_000,
          frequency: 'monthly',
          startMonth: startMonthText,
        },
      ])
      .run();

    tx.insert(scenarios)
      .values([
        {
          businessId: business.id,
          name: 'Base',
          kind: 'base',
          revenueGrowthPct: 0,
          priceChangePct: 0,
          revenueLossPct: 0,
          extraRecurringCostCents: 0,
          extraOneOffCostCents: 0,
          extraOneOffMonth: null,
        },
        {
          businessId: business.id,
          name: 'Cautious',
          kind: 'cautious',
          revenueGrowthPct: 0,
          priceChangePct: 0,
          revenueLossPct: 10,
          extraRecurringCostCents: 20_000,
          extraOneOffCostCents: 0,
          extraOneOffMonth: null,
        },
        {
          businessId: business.id,
          name: 'Growth',
          kind: 'growth',
          revenueGrowthPct: 4,
          priceChangePct: 0,
          revenueLossPct: 0,
          extraRecurringCostCents: 30_000,
          extraOneOffCostCents: 0,
          extraOneOffMonth: null,
        },
      ])
      .run();

    tx.insert(milestones)
      .values({
        businessId: business.id,
        title: 'Reach sustainable monthly revenue',
        targetDate: isoDate(new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + 3, 1))),
        status: 'planned',
      })
      .run();

    tx.insert(decisions)
      .values({
        businessId: business.id,
        title: 'Review contractor budget',
        decidedOn: startMonthText,
        expectedImpact: 'Keep the monthly cost base visible and controlled.',
        actualOutcome: null,
      })
      .run();

    tx.insert(subscriptions)
      .values({ userId: user.id, plan: 'free', status: 'active' })
      .onConflictDoNothing({ target: subscriptions.userId })
      .run();

    return business;
  });
}

if (process.argv[1]?.endsWith('db/seed.ts')) {
  const business = createDemoBusiness(DEMO_USER_ID);
  console.log(`Demo seed ready: ${business.name} (${business.id})`);
}
