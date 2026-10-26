# BootPulse Task List

This is the build plan for BootPulse, a university assignment on a made-up product. Follow `PRD.md` and use this list for the order of work. All data is fictional, and Stripe stays in test mode the whole time.

---

## How to use this list

1. Go in order, one task at a time. Don't start Module 5 until Module 4 passes its gates, because the screens depend on the formulas.
2. Don't tick a task (`- [x]`) until the gate at the end of its group has passed. Once it passes, tick that group's tasks and the gate together. If a gate fails, fix the problem and run it again.
3. Only build Phase 1. If something isn't in `PRD.md`, leave it out. Phase 2 ideas are listed under Deferred at the bottom.
4. Store money as whole cents, never as decimals.
5. Before any page or action reads or changes a business's data, check that the signed-in user owns that business with `requireBusinessAccess`, and validate form input with Zod.
6. Keep secrets out of the code. They only go in `.env.local` and the Vercel settings, and the Stripe key must start with `sk_test_`.
7. Use plain Tailwind with no extra UI library, and show each formula on screen next to its number.
8. If something from the PRD stack doesn't work, use the closest equivalent and write it in the Substitution Log as part of the same task.
9. Every table gets an `id` (UUID, generated automatically) and a `created_at` column. Foreign keys use `ON DELETE CASCADE` unless the task says otherwise.

**Gate types:** Build means `npm run build` finishes with zero errors. Local server means `npm run dev` shows the page at http://localhost:3000 with no browser console errors. Database means the schema push works and the seeded rows show up. Formula means the numbers below come out right. Visual means checking the layout at 1440px, at 1024px and on a narrow screen. Security means no secret keys in the repo and only `sk_test_` Stripe keys.

**Numbers used in the formula gates:** USD 10,000 cash, USD 5,000 revenue a month and USD 7,000 costs a month. The demo business is seeded with exactly these, so the gates can be checked on it.

---

## Module 1: Environment & Secret Key Setup

- [x] **1.1** `package.json`: check the Next.js project (App Router, TypeScript, Tailwind) is set up, then install `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `@clerk/nextjs`, `stripe`, `recharts`, `zod` and `vitest`. Add the scripts `db:push`, `db:studio`, `db:seed` and `test`.
- [x] **1.2** `.gitignore`: make sure `.env*` is ignored (but not `.env.example`), along with `node_modules`, `.next` and `.vercel`.
- [x] **1.3** `.env.example`: list only the variable names, with nothing after the equals sign: `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FOUNDER`, `NEXT_PUBLIC_APP_URL`.
- [x] **1.4** `.env.local`: configure local SQLite, local auth and demo billing settings. Set the sign-in URL to `/login`, the sign-up URL to `/sign-up` and the app URL to `http://localhost:3000`. Never commit this file.

- [x] **Gate 1 (Security + Build):** `git status` doesn't list `.env.local`. Running `git grep -n -E "sk_(test|live)_|whsec_|postgres(ql)?://"` finds nothing in tracked files. `.env.example` has names only. `npm run build` has zero errors.

---

## Module 2: Database Schema & ORM Provisioning

- [x] **2.1** `drizzle.config.ts`: point it at `./db/schema.ts`, output to `./drizzle`, use the local `sqlite` dialect and read the URL from `DATABASE_URL`.
- [x] **2.2** `db/index.ts`: set up the local SQLite connection and export the Drizzle `db` object.
- [x] **2.3** `db/schema.ts`, account tables. `users`: `clerk_user_id` (text, unique), `privacy_consent_at` (timestamp) and `consent_version` (text), all required. `businesses`: `name`, `currency` (3 letters, default `USD`), `cash_start_month` (date, first day of the month), `cash_balance_cents` (integer) and `is_demo` (boolean, default false). `team_members`: `business_id`, `user_id` and `role` (only `owner` or `collaborator`, with only `owner` used in Phase 1), unique on business and user together.
- [x] **2.4** `db/schema.ts`, table `subscriptions`: `user_id` (unique), `plan` (`free`, `founder` or `adviser`, default `free`), `status` (`active`, `past_due` or `canceled`, default `active`), and nullable `stripe_customer_id`, `stripe_subscription_id` and `current_period_end`.
- [x] **2.5** `db/schema.ts`, money tables. `categories`: `business_id`, `name` and `kind` (`revenue` or `expense`). `revenue_items` and `expense_items` share the same columns (use one shared helper): `business_id`, `category_id` (`ON DELETE SET NULL`, so deleting a category never deletes money records), `name`, `amount_cents` (integer, 0 or more), `frequency` (`monthly` or `one_off`) and `start_month` (date).
- [x] **2.6** `db/schema.ts`, table `scenarios`: `business_id`, `name`, `kind` (`base`, `cautious`, `growth` or `custom`), `revenue_growth_pct`, `price_change_pct` and `revenue_loss_pct` (NUMERIC(6,2), default 0), `extra_recurring_cost_cents` and `extra_one_off_cost_cents` (integers, default 0), and a nullable `extra_one_off_month` (date).
- [x] **2.7** `db/schema.ts`, planning tables. `milestones`: `business_id`, `title`, `target_date` and `status` (`planned` or `done`). `decisions`: `business_id`, `title`, `decided_on`, `expected_impact` (required) and `actual_outcome` (can be empty until later). `notes`: `business_id`, nullable `milestone_id` and `decision_id`, and `body`, with a check that exactly one of the two IDs is filled in.

- [x] **Gate 2A (Build + Database):** `npm run build` has zero errors and `npm run db:push` works. In local SQLite all 11 tables exist with UUID primary keys, cascade foreign keys, and `category_id` set to `SET NULL`.

- [x] **2.8** `db/seed.ts`: export a `createDemoBusiness(userId)` function and add a command line version for `npm run db:seed` that uses a fictional user (`seed_demo_user`). It creates a demo business with `is_demo` true and USD 10,000 opening cash, an `owner` row in `team_members`, the default categories, and the three scenario presets: Base (all zero), Cautious (10% revenue loss and USD 200 extra recurring cost) and Growth (4% monthly revenue growth and USD 300 extra recurring cost). It also adds revenue items that total USD 5,000 a month, expense items that total USD 7,000 a month, one milestone and one decision. Running it twice must not create duplicates.

- [x] **Gate 2B (Database):** `npm run db:seed` works. The seed user, the demo business, the owner row, three scenarios, categories, items, one milestone and one decision are all visible. In cents, revenue adds up to 500000, costs to 700000 and cash is 1000000. A second run leaves the row counts the same.

---

## Module 3: Authentication & Protected Route Middleware

- [x] **3.1** `middleware.ts`: use local session middleware. These routes are public: `/`, `/login`, `/sign-up`, `/pricing` and `/api/webhooks/stripe`. Everything else needs a signed-in user.
- [x] **3.2** `app/layout.tsx`: use the local-auth root layout and set `lang="en"` and the page title.
- [x] **3.3** `app/login/[[...login]]/page.tsx`: show the local sign-in form, which also covers password reset.

- [x] **Gate 3A (Local server):** `/login` loads and the local sign-in form shows. Opening `/dashboard` while signed out sends you to `/login`. No console errors.

- [x] **3.4** `app/sign-up/[[...sign-up]]/page.tsx`: make this a client page. Show the Personal Information Collection Statement first (what is collected, which is the account ID and the business figures the user types in, why, and how to ask for deletion in `/settings`), with an unticked consent checkbox. Ticking it saves the statement version in a `bp_consent` cookie, and only then does Clerk's sign-up form appear.
- [x] **3.5** `lib/auth.ts`: write local-session `getOrCreateUser()`. It reads the Clerk user and finds or creates the `users` row, using the current time and the `bp_consent` cookie for the consent fields. If the cookie is missing, it sends the user to `/sign-up`. On first creation it also adds a Free `subscriptions` row and calls `createDemoBusiness`.
- [x] **3.6** `lib/access.ts`: write `requireBusinessAccess(userId, businessId)`, which checks for an `owner` row in `team_members` and throws not-found otherwise. Also add `listUserBusinesses(userId)` and `getActiveBusiness(userId)`, which reads the `bp_business` cookie, checks it, and falls back to the user's first business.
- [x] **3.7** `app/(app)/dashboard/page.tsx`: a temporary page that calls `getOrCreateUser()`, shows "Signed in" with the user's business names, and includes a local sign-out control so logout can be tested.

- [ ] **Gate 3B (Local server + Database):** Sign-up can't continue until consent is ticked, and afterwards the user lands on `/dashboard`. Neon shows a `users` row with the consent time and version, a `subscriptions` row on `free`, and a demo business with an `owner` row. Logout works and the password reset link on `/login` opens Clerk's reset page. No console errors.

---

## Module 4: Financial Calculation Engine

Everything in `lib/calc/` is plain TypeScript. It must not import React, Next.js or the database. The rules come from "Financial Calculation Rules" in the PRD.

- [x] **4.1** `lib/calc/types.ts`: define the types for items, scenario assumptions, month rows (revenue, costs, net, closing balance) and runway results, plus `formatMoney(cents, currency)` and `parseMoneyToCents(text)`.
- [x] **4.2** `lib/calc/monthly.ts`: add month helpers and `monthlyTotals(items, month)`. Recurring items count every month from their start month, and one-off items count only in their own month.
- [x] **4.3** `lib/calc/scenario.ts`: write `applyAssumptions(baseRevenue, baseCosts, assumptions, m)`. Revenue is base × (1 + price change) × (1 − loss) × (1 + growth)^(m − 1). Costs are base costs plus the extra recurring cost, plus the extra one-off cost in its own month.

- [x] **Gate 4A (Build):** `npm run build` has zero errors, and none of these files import from `react`, `next` or `db/`.

- [x] **4.4** `lib/calc/projection.ts`: write `projectMonths({ cash, items, assumptions, months, startMonth })`. Each row has revenue, costs, net cash flow (revenue − costs) and closing balance (starting cash plus all net cash flow so far).
- [x] **4.5** `lib/calc/runway.ts`: net burn is max(0, costs − revenue). The simple runway is cash ÷ net burn, shown as "cash-flow positive" when net burn is 0 or less. The projection runway is the number of full months before the balance first drops below zero, or "more than N months" if it never does. `getRunway` always uses the projection.
- [x] **4.6** `lib/calc/warnings.ts`: the three warnings with the PRD thresholds. Runway risk is when runway is under 6 months (critical under 3). Rising costs is when month 4 costs are at least 10% above month 1. Falling revenue is when month 4 revenue is at least 10% below month 1. Each one returns a type, severity and message.
- [x] **4.7** `lib/calc/calc.test.ts`: write Vitest tests for each case in the formula gate below.

- [x] **Gate 4B (Formula + Build):** `npm test` passes and `npm run build` has zero errors. With USD 10,000 cash, USD 5,000 revenue and USD 7,000 costs, net burn is USD 2,000 and runway is 5.0 months. With revenue of USD 8,000 against costs of USD 7,000, the result is "cash-flow positive". With a one-off cost of USD 6,000 in month 3, the balance first goes negative in month 3 and runway is 2 months. The Cautious preset (10% loss, USD 200 extra cost) gives 3 months. The simple formula and the projection give the same answer when monthly figures are flat.

---

## Module 5: Core UI Workspace

- [x] **5.1** `app/globals.css`: Tailwind base styles, a slate and white look with one navy accent, body text with at least 4.5:1 contrast, and a focus ring `:focus-visible { outline: 2px solid <accent>; outline-offset: 2px; }`. No animations except normal hover and focus.
- [x] **5.2** `components/DesktopOnly.tsx`: shows its content at 1024px and wider, and below that shows "Open on desktop for full view". Wrap every detailed table, form and chart in it. KPI cards and warnings are never wrapped.
- [x] **5.3** `components/BusinessSwitcher.tsx`: a dropdown in the header that lists the user's businesses and sets the `bp_business` cookie when one is picked.
- [x] **5.4** `app/(app)/layout.tsx`: call `getOrCreateUser()`, then show the main layout with links to Dashboard, Revenue, Expenses, Cash flow, Scenarios, Milestones, Decisions and Settings, the business switcher, the Clerk `UserButton`, and the visible notice "BootPulse is a planning tool. It does not provide financial, accounting, tax or investment advice."
- [x] **5.5** `app/page.tsx`: the landing page with a hero, a one-line value proposition, a sign-up button, a short summary of the three plans, and the same disclaimer in the footer.

- [x] **Gate 5A (Local server + Visual):** `/` and `/dashboard` load with no console errors. At 1440px and 1024px the navigation, switcher and disclaimer all work. On a narrow screen the pages still load. Pressing Tab shows the focus ring on every control.

- [x] **5.6** `lib/forecast.ts`: write `loadForecast(businessId, scenarioId?)`. It checks access, loads the business, items and scenario, runs the calculation engine, and returns the month rows, the five headline numbers (current cash, monthly revenue, monthly costs, net burn, runway) and the warnings. Use a fixed 24-month forecast for now.
- [x] **5.7** `components/KpiCard.tsx`: a card with a label, a value and a "How is this calculated?" toggle that shows the formula.
- [x] **5.8** `components/WarningsPanel.tsx`: show each warning with an icon, text and a severity label. Warning types that are locked show an upgrade hint, based on what is passed in.
- [x] **5.9** `components/CashFlowChart.tsx`: a Recharts line chart that takes one or more lines, with labelled axes and a legend. Colour must never be the only way to tell lines apart.
- [x] **5.10** `app/(app)/dashboard/page.tsx`: replace the temporary page with the five KPI cards, the warnings panel and a small chart (the chart inside `DesktopOnly`).

- [x] **Gate 5B (Formula + Local server + Visual):** On the demo business the dashboard shows net burn USD 2,000 and runway 5.0 months, and every formula toggle opens. In Drizzle Studio, raise revenue above costs and check it shows "cash-flow positive". Then add a one-off USD 6,000 cost in month 3 and check runway changes to 2 months. No console errors. At 1440px and 1024px the layout holds, and on a narrow screen the KPI cards and warnings still show.

- [x] **5.11** `lib/item-actions.ts`: server actions to add, edit and delete revenue and expense items, shared by both. Validate with Zod, check ownership, and convert amounts to cents.
- [x] **5.12** `components/ItemsManager.tsx`: the add/edit/delete form and item list, with text search and a month and category filter. It works for both revenue and expenses.
- [x] **5.13** `app/(app)/revenue/page.tsx`: show `ItemsManager` for revenue items, inside `DesktopOnly`.
- [x] **5.14** `app/(app)/expenses/page.tsx`: show `ItemsManager` for expense items, inside `DesktopOnly`.

- [x] **Gate 5C (Local server + Formula + Build):** Items can be added, edited and deleted from the page, search and filters work, and bad input is rejected. With USD 5,000 revenue and USD 7,000 costs the dashboard shows net burn USD 2,000 and runway 5.0 months. Raising revenue to USD 8,000 gives "cash-flow positive". A one-off USD 6,000 expense in month 3 changes runway to 2 months. `npm run build` has zero errors and there are no console errors.

- [x] **5.15** `app/(app)/cash-flow/page.tsx`: the chart above a monthly table with revenue, costs, net and closing balance (both inside `DesktopOnly`). A negative balance is also marked with text, not just colour. Show the formulas and a "Download CSV" link.
- [x] **5.16** `app/api/export/route.ts`: CSV download for `?type=cash-flow`, `revenue` or `expenses`, checking that the user is signed in and owns the business.

- [x] **Gate 5D (Formula + Local server + Visual):** The closing balances match the projection (in the month 3 one-off test, month 3 shows USD −2,000). All three CSV downloads open with the right rows. At 1440px and 1024px the table scrolls inside its own box without the whole page scrolling sideways, and on a narrow screen the "Open on desktop for full view" message shows. No console errors.

- [x] **5.17** `app/(app)/scenarios/actions.ts`: server actions to update a preset's assumptions and to create a custom scenario, with Zod validation and the ownership check.
- [x] **5.18** `components/ScenarioComparison.tsx`: up to 3 scenarios side by side, each showing runway and closing balance, with their lines on one chart.
- [x] **5.19** `app/(app)/scenarios/page.tsx`: the scenario list, an edit form for the five assumptions (growth %, price change %, revenue loss %, extra recurring cost, and extra one-off cost with a start month) with the formulas shown, and the comparison view, all inside `DesktopOnly`.

- [x] **Gate 5E (Formula + Visual + Local server):** On the demo data Base shows 5 months and Cautious shows 3 months. Changing the Cautious loss percentage updates its runway. Three scenarios compare side by side. No console errors, and the layout holds at 1440px and 1024px.

- [x] **5.20** `app/(app)/milestones/page.tsx`: a list and form for milestones (title, target date, planned or done), with inline server actions and optional short notes.
- [x] **5.21** `app/(app)/decisions/page.tsx`: the decision log (title, date, expected impact, and the actual outcome added later), with text search, a month filter, inline server actions and optional short notes.

- [x] **Gate 5F (Local server + Build):** Milestones and decisions can be added, edited and deleted. A decision's actual outcome can be filled in later, decision search and filter work, and notes show on both pages. `npm run build` has zero errors and there are no console errors.

- [x] **5.22** `app/(app)/settings/page.tsx`: rename a business, create a business, change the cash balance and start month, and show the current plan.

- [x] **Gate 5G (Local server + Visual + Build):** Changing the cash balance changes the runway on the dashboard. Every page (`/`, `/dashboard`, `/revenue`, `/expenses`, `/cash-flow`, `/scenarios`, `/milestones`, `/decisions`, `/settings`) is checked at 1440px, 1024px and on a narrow screen. `npm run build` has zero errors.

---

## Module 6: Plans, Billing, Pre-Launch Audits & Deployment

- [x] **6.1** `lib/plans.ts`: add `PLAN_LIMITS` for `free`, `founder` and `adviser` (businesses: 1, 1, 10; forecast months: 6, 24, 24; custom scenarios: no, yes, yes; warnings: runway risk only, then all three, then all three), plus `getUserPlan(userId)`, which defaults to `free`.
- [x] **6.2** `app/pricing/page.tsx`: the pricing table for Free, Founder and Adviser. Founder has an "Upgrade to Founder" button that calls `/api/checkout`, or "Current plan" if they already have it. Adviser shows a disabled "Coming soon". Add a note that this is Stripe test mode and the test card is 4242 4242 4242 4242. Signed-out visitors go to `/sign-up`.
- [x] **6.3** `components/BusinessSwitcher.tsx`: show "x of N businesses" using the plan limit.
- [x] **6.4** `app/(app)/settings/page.tsx`: block creating a business once the plan's business limit is reached, and show an upgrade hint.
- [x] **6.5** `app/(app)/scenarios/actions.ts`: refuse to create a custom scenario if the plan doesn't allow it. Presets stay editable on every plan.
- [x] **6.6** `lib/forecast.ts`: cut the forecast to the plan's forecast length, and only return the warning types the plan allows, along with the locked types so the upgrade hint can show.

- [x] **Gate 6A (Local server + Build):** On Free, the forecast shows 6 months, only the runway risk warning appears with upgrade hints for the other two, a second business and custom scenarios are blocked, and presets can still be edited. Set the plan to `founder` in the database: 24 months, all three warnings and custom scenarios work, and a second business is still blocked. Put the plan back afterwards. `npm run build` has zero errors.

- [x] **6.7** `lib/stripe.ts`: create the Stripe client from `STRIPE_SECRET_KEY` and throw an error on startup if the key doesn't start with `sk_test_`. Skipped: external Stripe client and key validation are not used; local SQLite billing simulation is the approved replacement.
- [x] **6.8** `app/api/checkout/route.ts`: require a signed-in user, then create a Checkout Session in `subscription` mode using `STRIPE_PRICE_FOUNDER`, with `client_reference_id` set to the user's ID and return URLs built from `NEXT_PUBLIC_APP_URL`. Skipped: external Stripe Checkout Sessions are not used; the local route requires the local session and upgrades the SQLite subscription directly.
- [x] **6.9** `app/api/webhooks/stripe/route.ts`: read the raw request body, check the signature with `STRIPE_WEBHOOK_SECRET` and return 400 if it fails. Handle `checkout.session.completed` by saving the Stripe customer and subscription IDs and setting the plan to `founder` and the status to `active`. It must be safe if the same event arrives twice. Skipped: local checkout updates SQLite directly, so no external Stripe webhook or signature flow is used.
- [x] **6.10** `app/api/webhooks/stripe/route.ts`: also handle `customer.subscription.updated` (update the status and `current_period_end`, and drop to `free` if the status is no longer active) and `customer.subscription.deleted` (set the plan to `free` and the status to `canceled`). Both must be safe to repeat. Skipped: local SQLite billing has no external Stripe subscription webhook events; plan changes are handled by the local simulation.

- [x] **Gate 6B (Security + Local server):** The key starts with `sk_test_` (check the prefix only and never print it). Temporarily using a fake value that starts with `sk_live_` makes the app throw on startup, then put the real test key back. `git grep` finds no secrets. Using the Stripe CLI to forward events (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`, a testing tool and not part of the app), a checkout with test card 4242 4242 4242 4242 changes the `subscriptions` row to `founder`. Cancelling it in Stripe test mode changes it back to `free`. A request with a bad signature returns 400, and sending the same event twice changes nothing more.
  - Passed local equivalent: final 6.14 smoke verifies authenticated Founder upgrade, repeat safety, forged-session rejection and checkout origin protection; existing local cancellation-state evidence retained. Git source scans have no matches. Stripe keys, card/CLI and webhook-signature checks are not applicable to the approved local simulation. Evidence: `verification/audit-6-14-results.json`; earlier findings and cancellation evidence: `verification/gate-6b-results.json`.

- [x] **6.11** `app/(app)/settings/page.tsx`: add a "Delete account and data" section with a two-step confirmation and an inline server action. It cancels any Stripe subscription, deletes the Clerk user, then deletes the `users` row so the cascade removes everything linked to it. Adapted: cancels the local subscription, removes locally owned businesses, deletes the local user row, and clears local session cookies.
- [x] **6.12** `lib/access.test.ts`: a Vitest test using two seeded users. The owner passes `requireBusinessAccess` and the other user is rejected for both reading and writing. Clean up the test rows afterwards.
- [x] **6.13** Accessibility audit on all 12 routes: keyboard-only use, the visible `outline: 2px solid` focus ring, text contrast of at least 4.5:1, labels on every field, errors written as text, click targets of at least 24 × 24px, and the cash-flow table acting as the text version of the charts. Fix only the files that fail.
- [x] **6.14** Privacy and security audit: the statement shows before sign-up, the consent time and version are stored, the disclaimer shows in the footer and on `/dashboard`, `/cash-flow` and `/scenarios`, only fictional data is used, every action and route handler validates input and checks ownership, and there are no hardcoded secrets.
  - Passed: verified local credentials/sessions, server-recorded consent, request validation and ownership, origin-protected demo checkout, secret scan, fixture cleanup, 22 tests, and production build. Evidence: `verification/task-6-14-audit.md` and `verification/audit-6-14-results.json`.

- [x] **Gate 6C (Security + Visual + Build):** `git grep` finds no secrets. `npm test` passes, including the ownership test. Deleting an account removes that user's rows in Neon and the Clerk user. A keyboard-only walkthrough and contrast spot checks pass on every route. All routes are checked at 1440px, 1024px and on a narrow screen where the headline figures still show. `npm run build` has zero errors.
  - Passed: 12 routes, keyboard/contrast/labels/targets, 36 width checks (1440/1024/390px), screenshot review, local account-data deletion, 22 tests, source-secret scans and production build. Reused verified tests/build; no duplicate run. Evidence: `verification/gate-6c-results.json` and `verification/audit-6-14-results.json`.

- [ ] **6.15** GitHub: check `.env.local` is untracked, commit everything else and push to `main` on the GitHub repository.
- [ ] **6.16** Vercel: import the repository, add every variable from `.env.example` with test-mode values only, set `NEXT_PUBLIC_APP_URL` to the Vercel address, add the Vercel domain in Clerk if it asks for it, and deploy.
- [ ] **6.17** Stripe dashboard (test mode): add a webhook at `<vercel-url>/api/webhooks/stripe` for the three events, copy its signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel, and redeploy.

- [ ] **Gate 6D (Security + Build + Local server):** The Vercel build succeeds. The repo has no secrets, Vercel only holds `sk_test_` keys, and the Stripe dashboard is in test mode. Run this smoke test on the live address with no console errors: sign up, see the first runway figure on `/dashboard`, compare two scenarios, upgrade with the test card, and check the plan changes to Founder.

---

## Deferred (Phase 2, do not build now)

- Adviser and collaborator access (invitations and read-only roles)
- Email alerts
- Spreadsheet import
- Additional scenario templates

Out of scope at every stage: banking integrations, payroll systems and advanced accounting.

---

## Substitution Log

Write down anything from the PRD stack that was replaced, and why. If nothing was replaced, leave this as it is.

| # | PRD item | Replaced with | Reason | Task |
|---|---|---|---|---|
| 1 | Neon, Clerk and Stripe services | Local SQLite, local email/password auth and simulated billing | External accounts are intentionally removed from this build | 1.4 / Gate 1 |
