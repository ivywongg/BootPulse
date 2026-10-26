import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const id = () =>
  text('id')
    .primaryKey()
    .notNull()
    .default(sql`(lower(hex(randomblob(16))))`);

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable('users', {
  id: id(),
  createdAt: createdAt(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  privacyConsentAt: integer('privacy_consent_at', { mode: 'timestamp_ms' }).notNull(),
  consentVersion: text('consent_version').notNull(),
});

export const localCredentials = sqliteTable('local_credentials', {
  userId: text('user_id').primaryKey().notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const localSessions = sqliteTable('local_sessions', {
  tokenHash: text('token_hash').primaryKey().notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
});

export const businesses = sqliteTable('businesses', {
  id: id(),
  createdAt: createdAt(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('USD'),
  cashStartMonth: text('cash_start_month').notNull(),
  cashBalanceCents: integer('cash_balance_cents').notNull(),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
});

export const categories = sqliteTable(
  'categories',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['revenue', 'expense'] }).notNull(),
  },
  (table) => ({
    kindCheck: check(
      'categories_kind_check',
      sql`${table.kind} in ('revenue', 'expense')`,
    ),
  }),
);

const createMoneyItemsTable = (tableName: 'revenue_items' | 'expense_items') =>
  sqliteTable(
    tableName,
    {
      id: id(),
      createdAt: createdAt(),
      businessId: text('business_id')
        .notNull()
        .references(() => businesses.id, { onDelete: 'cascade' }),
      categoryId: text('category_id').references(() => categories.id, {
        onDelete: 'set null',
      }),
      name: text('name').notNull(),
      amountCents: integer('amount_cents').notNull(),
      frequency: text('frequency', { enum: ['monthly', 'one_off'] }).notNull(),
      startMonth: text('start_month').notNull(),
    },
    (table) => ({
      amountCheck: check(
        `${tableName}_amount_non_negative`,
        sql`${table.amountCents} >= 0`,
      ),
      frequencyCheck: check(
        `${tableName}_frequency_check`,
        sql`${table.frequency} in ('monthly', 'one_off')`,
      ),
    }),
  );

export const revenueItems = createMoneyItemsTable('revenue_items');
export const expenseItems = createMoneyItemsTable('expense_items');

export const scenarios = sqliteTable(
  'scenarios',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['base', 'cautious', 'growth', 'custom'] }).notNull(),
    revenueGrowthPct: real('revenue_growth_pct').notNull().default(0),
    priceChangePct: real('price_change_pct').notNull().default(0),
    revenueLossPct: real('revenue_loss_pct').notNull().default(0),
    extraRecurringCostCents: integer('extra_recurring_cost_cents').notNull().default(0),
    extraOneOffCostCents: integer('extra_one_off_cost_cents').notNull().default(0),
    extraOneOffMonth: text('extra_one_off_month'),
  },
  (table) => ({
    kindCheck: check(
      'scenarios_kind_check',
      sql`${table.kind} in ('base', 'cautious', 'growth', 'custom')`,
    ),
  }),
);

export const milestones = sqliteTable(
  'milestones',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    targetDate: text('target_date').notNull(),
    status: text('status', { enum: ['planned', 'done'] }).notNull(),
  },
  (table) => ({
    statusCheck: check(
      'milestones_status_check',
      sql`${table.status} in ('planned', 'done')`,
    ),
  }),
);

export const decisions = sqliteTable('decisions', {
  id: id(),
  createdAt: createdAt(),
  businessId: text('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  decidedOn: text('decided_on').notNull(),
  expectedImpact: text('expected_impact').notNull(),
  actualOutcome: text('actual_outcome'),
});

export const notes = sqliteTable(
  'notes',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    milestoneId: text('milestone_id').references(() => milestones.id, {
      onDelete: 'cascade',
    }),
    decisionId: text('decision_id').references(() => decisions.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
  },
  (table) => ({
    exactlyOneParent: check(
      'notes_exactly_one_parent',
      sql`(${table.milestoneId} is not null and ${table.decisionId} is null) or (${table.milestoneId} is null and ${table.decisionId} is not null)`,
    ),
  }),
);

export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: id(),
    createdAt: createdAt(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: ['free', 'founder', 'adviser'] })
      .notNull()
      .default('free'),
    status: text('status', { enum: ['active', 'past_due', 'canceled'] })
      .notNull()
      .default('active'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    planCheck: check(
      'subscriptions_plan_check',
      sql`${table.plan} in ('free', 'founder', 'adviser')`,
    ),
    statusCheck: check(
      'subscriptions_status_check',
      sql`${table.status} in ('active', 'past_due', 'canceled')`,
    ),
  }),
);

export const teamMembers = sqliteTable(
  'team_members',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'collaborator'] }).notNull(),
  },
  (table) => ({
    businessUserUnique: uniqueIndex('team_members_business_user_unique').on(
      table.businessId,
      table.userId,
    ),
  }),
);
