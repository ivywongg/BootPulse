# BootPulse: Product Requirements Document

> University assignment on a hypothetical product. All businesses, figures and prices are fictional. Stripe runs in TEST mode only. Target build: one solo founder, about 7 days, AI-assisted.

---

## 1. Executive Summary

**Core value proposition.** BootPulse is a desktop-first cash-flow, runway and scenario-planning dashboard. It tells founders how long their business can survive and whether decisions such as hiring a freelancer, buying software or changing prices are affordable. It replaces a loose spreadsheet with a clear, structured view and one headline number: months of runway.

**Personas**

| Persona | Profile | Needs |
|---|---|---|
| **Maya, solo founder (primary)** | Runs a bootstrapped online business, tracks money in a spreadsheet, has no finance team. | One trustworthy runway figure, and a quick way to test "can I afford this?" before committing. |
| **Daniel, startup adviser (secondary)** | Mentors several early-stage founders. | A consistent view of runway and past decisions across businesses. In Phase 1 he uses a normal account; the multi-business Adviser plan is "coming soon". |

**Monetisation mechanics.** BootPulse is freemium with a monthly subscription. Users start on Free. Upgrading to Founder happens on `/pricing` through Stripe Checkout in test mode (test card `4242 4242 4242 4242`). Stripe webhooks update the `subscriptions` table, and every limit is enforced on the server from one config file (`lib/plans.ts`). The Adviser plan is displayed as "coming soon" with no checkout button.

**Plan comparison (fictional prices)**

| Feature | Free (USD 0) | Founder (USD 19/mo) | Adviser (USD 49/mo) |
|---|---|---|---|
| Businesses | 1 | 1 | Up to 10 |
| Forecast length | 6 months | 24 months | 24 months |
| Preset scenarios (base / cautious / growth, editable) | Yes | Yes | Yes |
| Custom scenarios | No | Unlimited | Unlimited |
| Warnings | Runway risk only | Runway risk, rising costs, falling revenue | All warning types |
| Availability | Live | Live (test payments) | Coming soon |

**Assumptions**

1. Cash balance is entered manually; there is no bank sync.
2. Time is handled in calendar months. Month 1 is the month the user enters their cash balance for.
3. Each business has one currency (default USD), shown as a label only. There is no FX.
4. Warning thresholds (fictional defaults): runway risk when runway is under 6 months (critical under 3); rising costs when projected costs in month 4 are at least 10% above month 1; falling revenue when projected revenue in month 4 is at least 10% below month 1.
5. The Adviser plan is display-only in this build.
6. Downgrading never deletes data; views are simply limited to the plan's forecast length.
7. Phase 2 is documented but not built.
8. UI uses plain Tailwind components with no extra component library, to keep the build fast.

---

## 2. Phased Scope Isolation

### Phase 1: Core MVP (strictly essential)

The table defines what "done" means for each feature, so scope stays buildable in 7 days.

| Feature | MVP definition of done |
|---|---|
| Auth | Email sign-up, sign-in, logout and password reset handled entirely by Clerk's hosted components. |
| Businesses | Create, rename and switch between businesses; the count limit comes from the plan. First business is auto-created with demo data. |
| Plan gating | One `PLAN_LIMITS` config checked in server actions for forecast length, custom scenarios, warning types and business count. UI shows a short upgrade hint where a feature is locked. |
| Opening cash | One editable cash balance and start month per business. |
| Revenue and expenses | Two list pages with add, edit, delete. Items are either recurring monthly or one-off in a dated month. Name, amount, category, frequency, month. |
| Cash-flow table | Month-by-month revenue, costs, net and closing balance for the active scenario, limited to the plan's horizon. |
| Dashboard | Five KPI cards (current cash, monthly revenue, monthly costs, net burn, runway) plus the warnings panel. |
| Scenarios | Base, cautious and growth presets with editable assumptions; custom scenarios on paid plans. |
| Scenario comparison | Up to 3 scenarios side by side: runway, closing balance and a simple line chart. |
| Milestones | Title, target date, status (planned or done). |
| Decision log | Title, date, expected impact (text), actual outcome (text, filled in later). Optional short notes. |
| Warnings | Three rule-based warnings shown on screen, gated by plan. |
| Search, filter, export | Text search and month/category filter on revenue, expenses and decisions; CSV export of the cash-flow table and item lists. |
| Demo data | A fictional demo business seeded on first sign-in; fully editable and deletable. |
| Pricing and upgrade | Pricing table plus Stripe Checkout (test) for Founder, with three webhooks updating the plan. |

### Phase 2: Post-Launch Expansion (not built now)

- Adviser and collaborator access (invitations, read-only roles)
- Email alerts
- Spreadsheet import
- Additional scenario templates

**Explicitly out of scope at all stages:** banking integrations, payroll systems, advanced accounting.

### 7-Day Build Sequence

| Day | Deliverable |
|---|---|
| 1 | GitHub repo, Vercel deploy, Neon database, Drizzle schema and migration, Clerk auth, app shell with navigation, `lib/plans.ts`. |
| 2 | Business creation, categories, demo seed, revenue and expense CRUD with search and filter, `/settings` (cash balance, consent, deletion). |
| 3 | Calculation engine (pure TypeScript with unit tests), cash-flow table and chart, dashboard KPIs with visible formulas. |
| 4 | Scenarios, editable presets, comparison view, warnings panel. |
| 5 | Milestones, decision log with notes, CSV export. |
| 6 | Landing page, pricing page, Stripe Checkout and three webhooks, plan-gating checks. |
| 7 | Accessibility pass, disclaimer and PICS text, account deletion test, ownership-check test, full demo walkthrough, bug fixes, final deploy. |

**If a day slips, simplify in this order:** notes on decisions and milestones, chart styling (the table remains), CSV export for item lists (keep cash-flow export). No listed feature is removed; only its depth is reduced.

---

## 3. Architecture & UI Layout

### Layout principles

- Desktop-first: designed at 1440px and fully usable at 1024px.
- Below 1024px, show headline figures only (KPI cards and warnings); detailed tables and forms show a "Open on desktop for full view" message.
- Style: professional and trustworthy. Neutral slate and white surfaces, one navy accent, no animations beyond default focus and hover states.

### Page routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Landing page with hero, value proposition, plan summary | Public |
| `/login` | Clerk sign-in | Public |
| `/sign-up` | Clerk sign-up plus PICS and consent checkbox | Public |
| `/dashboard` | KPI cards, runway, warnings panel, mini chart | Signed in |
| `/revenue` | Revenue items list and form | Signed in |
| `/expenses` | Expense items list and form | Signed in |
| `/cash-flow` | Monthly table, chart, CSV export | Signed in |
| `/scenarios` | Scenario list, assumption editor, side-by-side comparison | Signed in |
| `/milestones` | Milestone list and form | Signed in |
| `/decisions` | Decision log with search and filter | Signed in |
| `/settings` | Business details, cash balance, plan, account and data deletion | Signed in |
| `/pricing` | Pricing table and test-payment upgrade | Public |

Three non-page route handlers are also needed: `/api/checkout`, `/api/webhooks/stripe` and `/api/export`. Everything else uses server actions.

### User journey

1. Visitor reads the landing page and opens `/sign-up`.
2. Visitor reads the PICS, ticks consent and creates an account through Clerk.
3. On first authenticated request, the app creates the `users` row (consent timestamp), a Free subscription row and a demo business with seeded data.
4. User lands on `/dashboard` and immediately sees the first runway figure and any warnings.
5. User opens `/revenue` or `/expenses`, edits items and updates the cash balance to match their own situation.
6. User opens `/scenarios`, adjusts the cautious preset (for example, a 10% revenue loss).
7. User selects two or three scenarios and sees the first side-by-side comparison of runway and closing balance.
8. User logs a decision and, when ready, upgrades on `/pricing` for longer forecasts and custom scenarios.

### Key UI components

| Component | Description |
|---|---|
| Landing hero | Headline, one-line value proposition, sign-up button, plan summary. |
| KPI cards | Five cards; each has a "How is this calculated?" toggle showing its formula. |
| Cash-flow table and chart | Table is the source of truth; Recharts line chart sits above it. |
| Scenario comparison view | Columns per scenario with runway, closing balance and overlaid chart lines. |
| Warnings panel | Icon, text and severity label; locked warning types show an upgrade hint. |
| Business switcher | Dropdown in the header; shows the plan's business limit. |
| Pricing table | Three plan columns; Adviser column marked "Coming soon". |

### Financial Calculation Rules

All money is handled in integer cents inside the calculation engine (`lib/calc.ts`, pure functions, unit tested). Every formula below is displayed in the UI next to the figure it produces.

1. **Current cash** is the balance the user enters for their chosen start month (Month 1). The user can update it at any time; there is no bank sync.
2. **Recurring items** repeat every month from their start month onward. **One-off items** count only in their specific month.
3. **Monthly revenue and costs** are the sums of that month's recurring and one-off items, after scenario assumptions are applied.
4. **Net monthly cash flow** = monthly revenue − monthly costs.
5. **Net burn** = max(0, monthly costs − monthly revenue).
6. **Projected balance** at the end of month m = current cash + sum of net monthly cash flow for months 1 to m.
7. **Runway (months)** = current cash / net burn, shown as "cash-flow positive" when net burn is 0 or negative.
8. **When one-off items or scenario assumptions make monthly figures uneven**, runway is read from the projected balance: it is the number of full months before the first month whose balance falls below zero. If the balance never falls below zero within the plan's forecast length, show "more than N months". The dashboard always uses the projection; the simple formula in rule 7 must give the same answer when monthly figures are flat (covered by a unit test).
9. **Scenario assumptions (all editable):**
   - Monthly revenue growth % (g)
   - Price change % (p)
   - Customer/revenue loss % (l)
   - Extra recurring monthly cost (X)
   - Extra one-off cost (Y) with a start month

   Scenario revenue in month m = base revenue × (1 + p) × (1 − l) × (1 + g)^(m−1).
   Scenario costs in month m = base costs + X + (Y if m is the extra one-off month, otherwise 0).

10. **Presets** are editable starting points of these assumptions: Base (all zero), Cautious (l = 10%, X = USD 200), Growth (g = 4%, X = USD 300). All values are fictional.
11. **Currency:** one currency per business; no conversion.

---

## 4. Technical Stack Constraints

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server components and server actions; no separate backend. |
| Language | TypeScript | Strict mode; Zod validates all form input. |
| Styling | Tailwind CSS | Plain components; no extra UI library. |
| ORM | Drizzle ORM | Schema and migrations in the repo. |
| Database | Neon PostgreSQL | Serverless Postgres with pooled connection string. |
| Auth | Clerk | Email and password, hosted components, password reset included. |
| Payments | Stripe Checkout | Test mode only; subscription mode. |
| Charts | Recharts | Line charts only. |
| Hosting | Vercel | Deployed from a GitHub repository; preview deploys on branches. |

**Not used:** BootPulse has no file uploads and no AI features, so no image-hosting or AI services are included in the stack.

**Substitution rule:** if an AI builder cannot support one of these items, it must substitute an equivalent and record the substitution in `tasklist.md` with the reason.

---

## 5. Database & Authentication Schema

**Conventions.** Every table has `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`. Money is stored as **integer cents** (`_cents` columns), never floating point. Month fields store the first day of the month as `DATE`. All foreign keys use `ON DELETE CASCADE` unless stated.

**Access control.** Every server query must go through one helper, `requireBusinessAccess(userId, businessId)`, which checks for an `owner` row in `team_members` before reading or writing. This per-user ownership check is used instead of Postgres Row Level Security, because Clerk sessions are not natively mapped to database roles on Neon and RLS would add setup time without changing behaviour in a single-owner MVP. An ownership-check test is part of Day 7.

**Computed on read.** Monthly summaries, runway and warnings are computed from items and scenarios on every read, not stored. This avoids stale data and keeps the schema small.

**users**

| Column | Type | Notes |
|---|---|---|
| clerk_user_id | TEXT | UNIQUE, NOT NULL |
| privacy_consent_at | TIMESTAMPTZ | NOT NULL; set at sign-up |
| consent_version | TEXT | NOT NULL; PICS version accepted |

**businesses**

| Column | Type | Notes |
|---|---|---|
| name | TEXT | NOT NULL |
| currency | CHAR(3) | NOT NULL, default `USD` |
| cash_start_month | DATE | NOT NULL |
| cash_balance_cents | INTEGER | NOT NULL |
| is_demo | BOOLEAN | NOT NULL, default false |

**team_members**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| user_id | UUID | FK to users |
| role | TEXT | CHECK in (`owner`, `collaborator`); only `owner` used in Phase 1 |

UNIQUE (business_id, user_id). The business count limit is the number of `owner` rows for a user.

**subscriptions**

| Column | Type | Notes |
|---|---|---|
| user_id | UUID | FK to users, UNIQUE |
| plan | TEXT | CHECK in (`free`, `founder`, `adviser`), default `free` |
| status | TEXT | CHECK in (`active`, `past_due`, `canceled`), default `active` |
| stripe_customer_id | TEXT | Nullable |
| stripe_subscription_id | TEXT | Nullable |
| current_period_end | TIMESTAMPTZ | Nullable |

**categories**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| name | TEXT | NOT NULL |
| kind | TEXT | CHECK in (`revenue`, `expense`) |

Default categories are seeded per business.

**revenue_items** and **expense_items** (identical structure)

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| category_id | UUID | FK to categories, `ON DELETE SET NULL` so deleting a category never deletes money records |
| name | TEXT | NOT NULL |
| amount_cents | INTEGER | NOT NULL, CHECK ≥ 0 |
| frequency | TEXT | CHECK in (`monthly`, `one_off`) |
| start_month | DATE | Recurring: first month; one-off: the month it occurs |

**scenarios**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| name | TEXT | NOT NULL |
| kind | TEXT | CHECK in (`base`, `cautious`, `growth`, `custom`) |
| revenue_growth_pct | NUMERIC(6,2) | Default 0 |
| price_change_pct | NUMERIC(6,2) | Default 0 |
| revenue_loss_pct | NUMERIC(6,2) | Default 0 |
| extra_recurring_cost_cents | INTEGER | Default 0 |
| extra_one_off_cost_cents | INTEGER | Default 0 |
| extra_one_off_month | DATE | Nullable |

**milestones**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| title | TEXT | NOT NULL |
| target_date | DATE | NOT NULL |
| status | TEXT | CHECK in (`planned`, `done`) |

**decisions**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| title | TEXT | NOT NULL |
| decided_on | DATE | NOT NULL |
| expected_impact | TEXT | NOT NULL |
| actual_outcome | TEXT | Nullable, filled in later |

**notes**

| Column | Type | Notes |
|---|---|---|
| business_id | UUID | FK to businesses |
| milestone_id | UUID | Nullable FK to milestones |
| decision_id | UUID | Nullable FK to decisions |
| body | TEXT | NOT NULL |

CHECK that exactly one of `milestone_id` and `decision_id` is set. Notes appear inside the milestone and decision views; there is no standalone notes page.

---

## 6. Third-Party API & Payment Boundaries

### Environment keys (`.env.local`)

| Key | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | Server secret | Neon connection string |
| `CLERK_SECRET_KEY` | Server secret | Clerk backend access |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public client key | Clerk frontend |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Public | Points Clerk at `/login` and `/sign-up` |
| `STRIPE_SECRET_KEY` | Server secret | Must start with `sk_test_`; live keys are never used |
| `STRIPE_WEBHOOK_SECRET` | Server secret | Verifies webhook signatures |
| `STRIPE_PRICE_FOUNDER` | Server | Test price ID for the Founder plan |
| `NEXT_PUBLIC_APP_URL` | Public | Checkout success and cancel URLs |

Rules: only variables prefixed `NEXT_PUBLIC_` may reach the browser. Commit `.env.example` with placeholder values and keep `.env.local` in `.gitignore`. Add the same variables to Vercel project settings. At startup, the server throws an error if `STRIPE_SECRET_KEY` does not start with `sk_test_`.

### Stripe Checkout

- **Trigger:** the "Upgrade to Founder" button on `/pricing` calls `/api/checkout`, which requires a signed-in user and creates a Checkout Session in `subscription` mode with the Founder test price. It sets `client_reference_id` to the user ID and uses `NEXT_PUBLIC_APP_URL` for return URLs.
- **Adviser plan:** no price, no checkout, "coming soon" label only.
- **Users on Free:** the button is shown; users already on Founder see "Current plan".

### Webhook listener (`/api/webhooks/stripe`)

Every request must pass signature verification using `STRIPE_WEBHOOK_SECRET`; unverified requests return 400.

| Event | Action |
|---|---|
| `checkout.session.completed` | Save Stripe customer and subscription IDs; set plan to `founder`, status `active`. |
| `customer.subscription.updated` | Sync status and `current_period_end`; downgrade plan if status is no longer active. |
| `customer.subscription.deleted` | Set plan to `free`, status `canceled`. |

Handlers must be idempotent (safe to receive the same event twice).

**Not used:** no banking, payroll or accounting APIs. No Clerk webhook is needed because the `users` row is created on first authenticated request.

---

## 7. Compliance & Security

**Accessibility (WCAG 2.2 Level AA)**
- Text contrast of at least 4.5:1 against its background, including text on buttons, badges and chart labels.
- All interactive elements show a visible focus ring: `outline: 2px solid` in the accent colour with a 2px offset.
- Full keyboard navigation; every form field has a visible label; error messages are text, not colour alone.
- Warnings and chart series use icons, labels or patterns in addition to colour.
- Click targets are at least 24 × 24 CSS pixels.
- The cash-flow table serves as the text alternative to every chart.

**Privacy (GDPR and HK PDPO)**
- A Personal Information Collection Statement (PICS) is shown on `/sign-up` before account creation, stating what is collected (account identifier, business figures the user enters), why, and how to request deletion.
- Sign-up requires an explicit consent checkbox; the consent timestamp and PICS version are stored in `users`.
- Data minimisation: BootPulse stores the Clerk user ID rather than copying personal details; payment card data never touches the app (handled by Stripe).
- `/settings` provides in-app account and data deletion: cancel any Stripe subscription, delete the Clerk user, then delete the `users` row so cascades remove all linked data. A confirmation step is required.

**Disclaimer.** A visible notice appears in the footer and on `/dashboard`, `/cash-flow` and `/scenarios`: *"BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice."*

**Data and secrets**
- Fictional data only: the demo business and all pricing are invented, and Stripe uses test mode only.
- Zero hardcoded secret keys anywhere in the repository; all secrets come from environment variables.
- Every server action validates input with Zod and checks business ownership before touching data.
- Webhook payloads are never trusted without signature verification.
