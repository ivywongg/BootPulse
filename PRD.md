# BootPulse: Product Requirements Document

> University assignment on a hypothetical product (MKTG 4150 NPM, Assignment 1). All businesses, figures and prices are fictional. Plans are an assignment-only demo: no payment is collected and no payment provider is used. Target build: one solo founder, about 7 days, AI-assisted. Implementation status lives in `tasklist.md`, not here.

**How to read this document.** Requirements marked *(Assignment)* come from the assignment brief (BootPulse overview on p.8, prompt on pp.22–23). Everything else is a PRD choice made to deliver them. Where this PRD departs from the brief, the departure is listed in [§1 Assignment alignment](#assignment-alignment) and recorded in the tasklist Substitution Log.

---

## 1. Executive Summary

**Core value proposition.** BootPulse is a desktop-first cash-flow, runway and scenario-planning dashboard for founders without a finance team. It shows how long the business can survive and whether decisions such as hiring a freelancer, buying software or changing prices are affordable, replacing a loose spreadsheet with one headline number: months of runway.

**Personas**

| Persona | Profile | Needs |
|---|---|---|
| **Maya, solo founder (primary)** | Runs a bootstrapped online business, tracks money in a spreadsheet, has no finance team. | One trustworthy runway figure and a quick way to test "can I afford this?". |
| **Daniel, startup adviser (secondary)** | Mentors several early-stage founders. | Access to founders' businesses as a collaborator, and (on the Adviser demo plan) up to 10 businesses of his own. |

**Monetisation (assignment demo).** Freemium monthly subscription, shown with fictional prices. Users choose a *demo plan* on `/pricing`. Choosing a plan changes limits only; it never collects payment details and never implies a purchase.

| Feature | Free (USD 0) | Founder (USD 19/mo) | Adviser (USD 49/mo) |
|---|---|---|---|
| Owned businesses | 1 | 1 | Up to 10 |
| Forecast length | 6 months | 24 months | 24 months |
| Preset scenarios (Base, Cautious, Growth, editable) | Yes | Yes | Yes |
| Custom scenarios | No | Unlimited | Unlimited |
| Warnings | Runway risk only | Runway, rising costs, falling revenue | All three |
| Collaborators per business | Yes | Yes | Yes |

**Assumptions**

1. Cash is entered manually; there is no bank sync. Currency is one per business (default USD) and is a label only.
2. Time is calendar months. Month 1 is the month containing the business's start date.
3. Warning thresholds are fictional defaults (see §3 Financial rules).
4. Downgrading never deletes data; views are limited to the plan's forecast length and creation limits.
5. UI uses plain Tailwind components with no component library.

### Assignment alignment

| Assignment requirement | PRD treatment |
|---|---|
| Email sign-up, sign-in, logout, **password reset** | Supabase Auth with email confirmation and Supabase's password-recovery email. Live email delivery depends on Supabase email configuration (Phase 4). |
| One or more businesses per account | Yes. Free and Founder own 1; Adviser owns up to 10. |
| **Role support for owner and collaborator** | Implemented in MVP: an owner grants an existing registered account collaborator access (see permission matrix, §3). |
| Paid adviser or multi-business plan; pricing page; **"upgrade flow using test payments only"** | **Departure by project decision:** an assignment-only *simulated* upgrade (server action that records a demo plan). No Stripe or other provider, not even sandbox mode; no card, bank or billing data; no invoices, subscriptions or webhooks. The app never claims a purchase succeeded. |
| Revenue and expense entry; recurring and one-off | Yes. |
| Dashboard (cash, revenue, costs, net burn, runway); cash-flow table | Yes. |
| Scenarios: base, cautious, growth; editable; side-by-side | Yes; custom scenarios on Founder/Adviser. |
| Milestones; decision log (expected impact, actual outcome); notes | Yes. |
| Warnings: runway, rising costs, falling revenue | Yes, gated by plan. |
| Search, filtering, export | Yes (see routes). |
| Seeded fictional demo data | Yes, created on first sign-in; editable and deletable. |
| Show how burn and runway are calculated; simple, transparent, editable | Formulas are shown next to every figure (§3). |
| Desktop-first; accessible contrast and labels | Yes (§3 layout, §7). |
| Entity list incl. *Monthly summaries* | Monthly summaries are computed on read, not stored (no staleness). |

---

## 2. Phased Scope Isolation

### Phase 1: Core MVP (this build)

| Feature | Definition of done |
|---|---|
| Auth | Email sign-up with confirmation, sign-in, logout, password recovery via Supabase Auth; protected routes; account deletion. |
| Consent | PICS shown before the sign-up form; explicit consent; consent time and statement version stored per user. |
| Businesses | Create, rename, switch; a first fictional demo business is created on first sign-in; owned-business count limited by plan. |
| Roles | Owner and collaborator per business; owner grants and revokes by email of an existing account. |
| Opening cash | One editable cash balance and start month per business. |
| Revenue and expenses | Add, edit, delete; recurring monthly or one-off in a dated month; categories; search and filter. |
| Cash-flow | Monthly table (revenue, costs, net, closing balance) and chart for the active scenario, within the plan horizon. |
| Dashboard | Five KPI cards (current cash, monthly revenue, monthly costs, net burn, runway), warnings, projection chart. |
| Scenarios | Base, Cautious, Growth presets with editable assumptions; custom scenarios on paid demo plans; side-by-side comparison of up to 3. |
| Milestones and decisions | Milestones (title, target date, status, notes). Decisions (title, date, expected impact, actual outcome added later, notes) with search and month filter. |
| Warnings | Three rule-based warnings, gated by plan. |
| Export | CSV of the cash-flow table, revenue items and expense items. Export obeys the same access rules as the UI. |
| Demo plans | `/pricing` with fictional prices; confirmation step; server-validated plan switch; limits enforced on the server. |
| Deletion | Settings: delete a business (owner), delete account and data (confirmed). |

### Deferred (not built)

- Email invitations to people without an account, read-only collaborator role, ownership transfer.
- Email alerts, spreadsheet import, additional scenario templates, multi-currency.
- Real payments of any kind.

**Explicitly out of scope at all stages:** banking integrations, payroll systems, advanced accounting.

### Build order

1. Documents, Postgres migration, Supabase Auth, access control, calculation tests.
2. Core financial flows verified end to end.
3. Planning features, demo plans, frontend repair.
4. Email configuration, verification, handoff.

---

## 3. Architecture & UI Layout

### Layout principles

- Desktop-first: designed at 1440px and fully usable at 1024px.
- Below 1024px the headline figures (KPI cards, warnings) remain; wide tables, forms and charts show an "Open on desktop for full view" explanation.
- Professional and trustworthy. Palette: background `#f8fafc`, surface `#ffffff`, text `#0f172a`, muted `#475569`, border `#cbd5e1`, navy accent `#1e3a8a` (hover `#1e40af`). No decorative effects.

### Page routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Landing page, plan summary | Public |
| `/login` | Sign in | Public |
| `/sign-up` | PICS, consent, sign-up | Public |
| `/forgot-password` | Request recovery email | Public |
| `/reset-password` | Choose a new password (needs the recovery session) | Recovery session |
| `/auth/confirm` | Handles email links (`token_hash` or `code`) | Public (route handler) |
| `/pricing` | Fictional plans, demo-plan switch | Public to view; signed in to switch |
| `/dashboard` | KPIs, warnings, chart | Owner or collaborator |
| `/revenue`, `/expenses` | Item lists, forms, search and filter | Owner or collaborator |
| `/cash-flow` | Table, chart, CSV link | Owner or collaborator |
| `/scenarios` | Assumption editors, custom scenarios, comparison | Owner or collaborator (custom: plan-gated) |
| `/milestones`, `/decisions` | Lists, forms, notes, decision search and filter | Owner or collaborator |
| `/settings` | Business details, cash, demo plan, sharing, deletion | Signed in (owner-only sections marked) |
| `/api/export` | CSV download (`type=cash-flow\|revenue\|expenses`) | Owner or collaborator |

Everything else uses server actions. There are no payment or webhook routes.

### User journey

1. Visitor reads the landing page, opens `/sign-up`, reads the PICS and ticks consent.
2. Visitor submits email and password; Supabase sends a confirmation email.
3. After confirming, the visitor signs in. On first verified request the app creates the profile, a Free demo plan and a fictional demo business.
4. The dashboard shows the first runway figure and warnings.
5. User edits cash, revenue and expenses; the forecast updates.
6. User edits the Cautious preset and compares scenarios.
7. User logs a decision, exports the cash-flow CSV, and optionally tries the Founder or Adviser demo plan.

### Permission matrix

| Action | Owner | Collaborator | Other signed-in user |
|---|---|---|---|
| View dashboard, cash flow, scenarios, milestones, decisions, export | Yes | Yes | 404 |
| Edit items, scenarios, milestones, decisions, notes, opening cash, business name | Yes | Yes | 404 |
| Create a custom scenario | If the **owner's** plan allows | If the **owner's** plan allows | 404 |
| Invite or revoke collaborators | Yes | No | 404 |
| Delete the business | Yes (not the last accessible one) | No | 404 |
| Change ownership | Not supported | No | n/a |
| Change demo plan | Own plan only | Own plan only (no effect on shared businesses) | Own plan only |
| Create a business | Within own plan limit | Within own plan limit | Within own plan limit |

**Plan scope.** Forecast length, warnings and custom scenarios of a business follow the **owner's** plan. A collaborator's own plan applies only to businesses they own. The owned-business limit counts only `owner` memberships.

### Key UI components

KPI cards with a "How is this calculated?" toggle; cash-flow table and chart (table is the text alternative to the chart); scenario comparison (columns plus overlaid lines); warnings panel (icon, text, severity label); business switcher (owned count versus limit; shared businesses labelled); pricing table with "Assignment demo — no payment is collected"; items manager with search and filter.

### Financial Calculation Rules

Implemented once in `lib/calc/*` (pure TypeScript, unit tested). Every figure in the UI shows its formula.

1. **Money** is integer cents everywhere (stored as 32-bit integers, maximum 2,000,000,000 cents). Inputs allow at most two decimals. Display uses `Intl.NumberFormat`.
2. **Months.** A month is a calendar month stored as the first day (`YYYY-MM-01`); any submitted day is normalised to the 1st. Month 1 is the month of the business's start date; month *m* is `start + (m−1)` months, rolling over years.
3. **Item timing.** A *monthly* item counts in every month from its start month onward; if it started before month 1 it counts from month 1. A *one-off* item counts only in its own month; one-offs outside the forecast window never count.
4. **Base revenue and costs** for a month are the sums of the active items.
5. **Scenario revenue** in month *m* = round(base revenue × (1 + p) × (1 − l) × (1 + g)^(m−1)) where p is price change, l revenue loss, g monthly growth (each stored as a percent with two decimals). Growth compounds from forecast month 1, not from an item's start. **Scenario costs** = base costs + X (extra recurring) + Y (extra one-off) in the one-off's month (matched by calendar month; none if unset).
6. **Rounding.** Revenue is rounded once per month to whole cents, halves away from zero, after removing floating-point noise (12 significant digits). Costs and balances are exact integers; no other rounding occurs, so negative balances are exact.
7. **Net cash flow** = revenue − costs. **Closing balance** of month *m* = opening cash + Σ net cash flow of months 1…*m*.
8. **Net burn** (headline) = max(0, month-1 costs − month-1 revenue) for the selected scenario.
9. **Runway (headline)** = the number of complete months before the first month whose closing balance is **below zero**. A balance of exactly zero is not depleted. If month 1 already closes below zero, runway is 0. If the balance never goes below zero within the horizon: show "cash-flow positive" when month-1 net burn is 0, otherwise "more than N months" where N is the plan horizon. The simple formula cash ÷ net burn is shown as a cross-check; it equals the projection result when monthly figures are flat and cash is an exact multiple of burn (unit-tested), and the headline always uses the projection (whole months).
10. **Warnings** (evaluated on the horizon): *runway risk* when projection runway < 6 months (critical < 3); *rising costs* when month-4 costs ≥ 110% of month-1 costs (or month 1 is zero and month 4 is positive); *falling revenue* when month-1 revenue > 0 and month-4 revenue ≤ 90% of it. Needs at least 4 months. Plan gating removes types the plan does not include and shows an upgrade hint.
11. **Presets** (fictional, editable): Base (all zero); Cautious (l = 10%, X = USD 200); Growth (g = 4%, X = USD 300). Demo business: USD 10,000 cash, USD 5,000 revenue and USD 7,000 costs per month, giving net burn USD 2,000 and runway 5 months (Cautious: 3).
12. **Currency:** one per business, no conversion.

---

## 4. Technical Stack Constraints

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Server components and actions; Next 16 `proxy.ts` refreshes sessions. |
| Language | TypeScript | Strict; Zod validates all input. |
| Styling | Tailwind CSS | Plain components. |
| ORM | Drizzle ORM | Schema in `db/schema.ts`; SQL migrations in `drizzle/`, applied manually with `npm run db:migrate`. |
| Database | Supabase PostgreSQL | Runtime uses the **transaction pooler** connection (`DATABASE_URL`, `prepare: false`, one connection per instance). Migrations use `DIRECT_URL`. |
| Auth | Supabase Auth via `@supabase/ssr` | Email and password, email confirmation, recovery email. Server code trusts only `auth.getUser()`. |
| Payments | None | Assignment-only demo plans (§6). |
| Charts | Recharts | Line charts. |
| Hosting | Vercel | Deployed from GitHub; no filesystem persistence is used. |
| Tests | Vitest with PGlite | In-memory Postgres runs the real migrations; no native modules. |

Substitutions from the original plan (Neon, Clerk, Stripe) and from the interim SQLite/local-auth build are recorded in `tasklist.md`.

---

## 5. Database & Authentication Schema

**Conventions.** UUID primary keys (`gen_random_uuid()`), `created_at timestamptz`, money in integer `_cents` columns, month and calendar dates as `date`, foreign keys `ON DELETE CASCADE` unless stated. All tables have **row-level security enabled with no policies**, and the Supabase `anon` and `authenticated` roles have no privileges, so nothing is readable or writable through the Supabase Data API.

**Authorisation model.** The app reads and writes through a direct server-side Postgres connection, which does **not** inherit the signed-in user's RLS context. Authorisation is therefore explicit: every server action, page and route handler resolves the user from `auth.getUser()` and calls `requireBusinessAccess` (owner or collaborator) or `requireBusinessOwner` before touching business data, and every query is also scoped by `business_id`. A submitted user ID is never used as identity. Tests cover owner, collaborator and unrelated users.

**users** — `id` (= Supabase `auth.users.id`; FK added by the migration where the `auth` schema exists), `email` (unique, lower case; used to find an existing account when sharing), `privacy_consent_at`, `consent_version`.

**businesses** — `name`, `currency char(3)` default `USD`, `cash_start_month date`, `cash_balance_cents int`, `is_demo bool`.

**team_members** — `business_id`, `user_id`, `role` in (`owner`, `collaborator`); unique (`business_id`, `user_id`); at most one `owner` per business (partial unique index).

**subscriptions** — `user_id` (unique), `plan` in (`free`, `founder`, `adviser`) default `free`, `updated_at`. Demo state only: no billing identifiers.

**categories** — `business_id`, `name`, `kind` in (`revenue`, `expense`). Seven defaults are seeded per business.

**revenue_items / expense_items** — `business_id`, `category_id` (`ON DELETE SET NULL`), `name`, `amount_cents` ≥ 0, `frequency` in (`monthly`, `one_off`), `start_month date`.

**scenarios** — `business_id`, `name`, `kind` in (`base`, `cautious`, `growth`, `custom`), `revenue_growth_pct`, `price_change_pct`, `revenue_loss_pct` (`numeric(6,2)`), `extra_recurring_cost_cents`, `extra_one_off_cost_cents`, `extra_one_off_month date` (nullable). Every new business gets the three presets.

**milestones** — `business_id`, `title`, `target_date`, `status` in (`planned`, `done`).

**decisions** — `business_id`, `title`, `decided_on`, `expected_impact`, `actual_outcome` (nullable).

**notes** — `business_id`, `milestone_id` or `decision_id` (exactly one).

**Migrations.** `drizzle/0000_init.sql` (tables) and `drizzle/0001_rls_and_auth_fk.sql` (RLS, and on Supabase the `auth.users` foreign key and role revokes). Never run on request or at build time.

**Computed on read:** monthly summaries, runway, warnings.

---

## 6. Third-Party API & Plan Boundaries

### Environment variables

| Key | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase publishable (anon-level) key |
| `NEXT_PUBLIC_APP_URL` | Public | Public origin used in email redirect links |
| `DATABASE_URL` | Server secret | Supabase pooled (transaction) connection string |
| `DIRECT_URL` | Server secret | Direct or session-pooler string, migrations only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Only for deleting the Auth user during account deletion |

Rules: only `NEXT_PUBLIC_` values may reach the browser; `.env.example` holds placeholders; real values live in ignored `.env.local` and Vercel project settings; the service-role key is imported only by server actions.

### Supabase Auth

- Email confirmation is required before first sign-in. Sign-up passes the consent version and time as sign-up metadata; the app copies them into `users` on first verified request, rejecting missing, stale-version or future-dated consent.
- Email links go to `/auth/confirm` (`token_hash`+`type`, or PKCE `code`) and then to a validated same-site path. Recovery lands on `/reset-password`.
- Responses never reveal whether an email has an account (sign-up and recovery use generic messages). Sharing a business necessarily confirms whether an email has an account; this is accepted for the demo.
- Recovery links are never displayed or logged by the app. Email delivery uses Supabase's mailer; custom SMTP and a verified sending domain are required for arbitrary recipients (Phase 4 checklist).

### Demo plans (no payments)

- `/pricing` lists Free, Founder and Adviser with fictional prices and the banner "Assignment demo — no payment is collected".
- "Try Founder demo" / "Try Adviser demo" / "Return to Free" open a confirmation that lists the features that will be enabled; confirming calls a server action that validates the plan name and the signed-in user and updates `subscriptions`.
- Nothing is charged; no card, bank or billing data is requested; no subscription, invoice or webhook exists. Copy never says "purchased", "paid" or "subscribed".
- Limits are enforced on the server from `lib/plans.ts`: owned businesses, forecast months, custom scenarios, warning types.

---

## 7. Compliance & Security

**Accessibility (WCAG 2.2 AA).** Text contrast ≥ 4.5:1; visible focus ring (`2px solid` navy, 2px offset) on every control; full keyboard use; every field has a visible label; errors are text, not colour alone; warnings and chart series use text or patterns as well as colour; targets ≥ 24 × 24 px; the cash-flow table is the text alternative to charts.

**Privacy (GDPR and HK PDPO).** The PICS appears before the sign-up form and states what is collected (email, password via Supabase Auth, business figures entered, a copy of the email for sharing, consent time and version), why, where it is stored (Supabase-hosted services) and how to delete it. Explicit consent is required; consent time and version are stored. Payment data is never collected. Settings provides confirmed deletion of a business and of the account (deletes the Auth user and every owned business; shared businesses owned by others are unaffected).

**Disclaimer.** The footer, `/dashboard`, `/cash-flow` and `/scenarios` show: *"BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice."*

**Data and secrets.** Fictional data only and labelled as such. No secret in the repository. Every server action validates input with Zod and checks business access first. Exports neutralise spreadsheet formula injection. Secrets are server-only.

---

## 8. Acceptance Criteria

| # | Criterion | Check |
|---|---|---|
| AC1 | Sign-up requires consent; consent time and version are stored. | Test + manual |
| AC2 | Unconfirmed accounts cannot sign in; confirmed accounts reach `/dashboard` and see a Free plan and one demo business. | Manual (live email in Phase 4) + provisioning test |
| AC3 | Logout ends the session; protected routes redirect signed-out visitors to `/login`. | Manual |
| AC4 | Password recovery email leads to `/reset-password`; the new password works. | Manual (live email in Phase 4) |
| AC5 | Demo business shows net burn USD 2,000 and runway 5 months; Cautious shows 3. | Unit + manual |
| AC6 | Editing cash, items or assumptions persists across refresh and sign-out/in and changes the forecast. | Integration test + manual |
| AC7 | Calculation edge cases pass: month rollover, one-off timing, exact-zero balance, first negative month, zero burn, horizon limit, rounding. | Unit tests |
| AC8 | A user with no membership cannot read, write or export another business (404). | Integration test |
| AC9 | A collaborator can edit planning data; cannot invite, revoke, delete the business or change plans; follows the owner's plan limits. | Integration test |
| AC10 | Free → Founder → Adviser → Free preserves all data; limits change as specified; the server rejects unknown plans. | Integration test + manual |
| AC11 | Free blocks custom scenarios and a second owned business on the server; Adviser allows up to 10 owned. | Integration test |
| AC12 | `/pricing` shows "Assignment demo — no payment is collected", requests no payment data and never claims a purchase. | Manual |
| AC13 | CSV exports for cash-flow, revenue and expenses match the screen and obey access rules. | Manual + test |
| AC14 | Account deletion removes the Auth user and owned businesses and leaves shared businesses intact. | Integration test + manual |
| AC15 | `npm run build` and `npm test` pass; no native modules; app runs on Vercel with only the documented variables. | CI-style run + deploy check |
| AC16 | Keyboard-only use works on every page; contrast and labels meet §7; 1440px, 1024px and a narrow viewport are readable. | Manual |
