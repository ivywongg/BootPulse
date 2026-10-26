import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const percent = (name: string) =>
  numeric(name, { precision: 6, scale: 2, mode: 'number' }).notNull().default(0);

// users.id equals the Supabase Auth user id (auth.users.id). The foreign key to
// auth.users is added by the migration only where the auth schema exists.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  createdAt: createdAt(),
  email: text('email').notNull().unique(),
  privacyConsentAt: timestamp('privacy_consent_at', { withTimezone: true }).notNull(),
  consentVersion: text('consent_version').notNull(),
});

export const businesses = pgTable('businesses', {
  id: id(),
  createdAt: createdAt(),
  name: text('name').notNull(),
  currency: char('currency', { length: 3 }).notNull().default('USD'),
  cashStartMonth: date('cash_start_month', { mode: 'string' }).notNull(),
  cashBalanceCents: integer('cash_balance_cents').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
});

export const teamMembers = pgTable(
  'team_members',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'collaborator'] }).notNull(),
  },
  (table) => [
    unique('team_members_business_user_unique').on(table.businessId, table.userId),
    uniqueIndex('team_members_one_owner').on(table.businessId).where(sql`${table.role} = 'owner'`),
    check('team_members_role_check', sql`${table.role} in ('owner', 'collaborator')`),
  ],
);

// Demo plan only: no payment provider, no billing identifiers.
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    createdAt: createdAt(),
    userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    plan: text('plan', { enum: ['free', 'founder', 'adviser'] }).notNull().default('free'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('subscriptions_plan_check', sql`${table.plan} in ('free', 'founder', 'adviser')`)],
);

export const categories = pgTable(
  'categories',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['revenue', 'expense'] }).notNull(),
  },
  (table) => [check('categories_kind_check', sql`${table.kind} in ('revenue', 'expense')`)],
);

const createMoneyItemsTable = (tableName: 'revenue_items' | 'expense_items') =>
  pgTable(
    tableName,
    {
      id: id(),
      createdAt: createdAt(),
      businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
      // A deleted category never deletes money records.
      categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
      name: text('name').notNull(),
      amountCents: integer('amount_cents').notNull(),
      frequency: text('frequency', { enum: ['monthly', 'one_off'] }).notNull(),
      startMonth: date('start_month', { mode: 'string' }).notNull(),
    },
    (table) => [
      check(`${tableName}_amount_non_negative`, sql`${table.amountCents} >= 0`),
      check(`${tableName}_frequency_check`, sql`${table.frequency} in ('monthly', 'one_off')`),
    ],
  );

export const revenueItems = createMoneyItemsTable('revenue_items');
export const expenseItems = createMoneyItemsTable('expense_items');

export const scenarios = pgTable(
  'scenarios',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['base', 'cautious', 'growth', 'custom'] }).notNull(),
    revenueGrowthPct: percent('revenue_growth_pct'),
    priceChangePct: percent('price_change_pct'),
    revenueLossPct: percent('revenue_loss_pct'),
    extraRecurringCostCents: integer('extra_recurring_cost_cents').notNull().default(0),
    extraOneOffCostCents: integer('extra_one_off_cost_cents').notNull().default(0),
    extraOneOffMonth: date('extra_one_off_month', { mode: 'string' }),
  },
  (table) => [
    check('scenarios_kind_check', sql`${table.kind} in ('base', 'cautious', 'growth', 'custom')`),
  ],
);

export const milestones = pgTable(
  'milestones',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    targetDate: date('target_date', { mode: 'string' }).notNull(),
    status: text('status', { enum: ['planned', 'done'] }).notNull(),
  },
  (table) => [check('milestones_status_check', sql`${table.status} in ('planned', 'done')`)],
);

export const decisions = pgTable('decisions', {
  id: id(),
  createdAt: createdAt(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  decidedOn: date('decided_on', { mode: 'string' }).notNull(),
  expectedImpact: text('expected_impact').notNull(),
  actualOutcome: text('actual_outcome'),
});

export const notes = pgTable(
  'notes',
  {
    id: id(),
    createdAt: createdAt(),
    businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => milestones.id, { onDelete: 'cascade' }),
    decisionId: uuid('decision_id').references(() => decisions.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
  },
  (table) => [
    check(
      'notes_exactly_one_parent',
      sql`(${table.milestoneId} is not null and ${table.decisionId} is null) or (${table.milestoneId} is null and ${table.decisionId} is not null)`,
    ),
  ],
);
