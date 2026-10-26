# BootPulse Task List

Build plan and status for BootPulse (university assignment, fictional product). Requirements live in `PRD.md`; this file tracks work and evidence. Four phases; checks are listed per task instead of a gate after every group.

**Status key.** `[x]` = done **and verified** (evidence given). `[ ]` = not done or not verified, with one of: **Implemented, unverified** (code exists, evidence missing), **Pending**, **Blocked** (needs something outside the code), **Deferred** (out of scope for now). Old task numbers are kept as *(was N.N)*.

**Rules.** Money is integer cents. Every page, action and route checks the signed-in user and business access before touching data and validates input with Zod. No secrets in the repository; plans are an assignment demo with no payment provider. Record any change from `PRD.md` in the Substitution Log.

**Verification environments.** *Local stack* = Supabase CLI (Docker) with the repository's `supabase/config.toml`, real Auth, Postgres and Mailpit email capture, app run with `npm run dev`. *Tests* = Vitest with in-memory Postgres (PGlite) running the real migrations. *Hosted* = the real Supabase project and Vercel; **nothing has been verified on hosted services yet**.

---

## Phase 1 — Review and requirements (complete)

- [x] **1.1** Validate the earlier review. Evidence: deployed probe on 2026-10-26 (`/` 200, `/sign-up` 200, `/login` 500, `/pricing` 500, `/dashboard` redirects to the failing `/login`); `better-sqlite3` crashed on the test machine (exit 3221225477); package scripts and docs audited. *(was Module 1–6 audit)*
- [x] **1.2** Compare assignment, PRD and code; record conflicts in `PRD.md` §1 *Assignment alignment* (real password reset, collaborator role, purchasable Adviser plan, multi-business, demo upgrade departure).
- [ ] **1.3** **Pending (optional):** confirm the original Vercel 500 cause from Vercel logs. Likely the SQLite file or native binary on a read-only, non-persistent filesystem; superseded because SQLite is removed.

---

## Phase 2 — Documents, Postgres migration, Supabase Auth, core flows

### Documents
- [x] **2.1** One canonical `PRD.md` (renamed from `PRD-2 2.md`), rewritten for Supabase, roles, demo plans, formulas and acceptance criteria. Check: file review.
- [x] **2.2** `tasklist.md` reorganised into four phases; unsupported completion claims reopened (see *Reopened claims*).
- [x] **2.3** `README.md` has setup, scripts and deployment checklist. Final reconciliation is task 4.11.

### Persistence *(was 2.1–2.8)*
- [x] **2.4** Postgres schema in `db/schema.ts`; migrations `drizzle/0000_init.sql` and `drizzle/0001_rls_and_auth_fk.sql`; `npm run db:migrate`. Evidence: applied twice to the local stack with no error; 11 tables, row-level security on every table, `users.id → auth.users` foreign key, and `anon` / `authenticated` have no table privileges (Data API read returned `42501 permission denied`); the same migrations run in the test suite.
- [x] **2.5** Driver `postgres` + `drizzle-orm/postgres-js`, `prepare: false`, one connection per instance, lazy connect so builds need no credentials. Native SQLite removed (`better-sqlite3`, `@types/better-sqlite3`, `@clerk/nextjs`, `@neondatabase/serverless`, `stripe` uninstalled). Evidence: `npm run build` passes; `npm test` runs without native modules.
- [x] **2.6** Fictional seed data (`db/seed.ts`): demo business on first sign-in; default categories and three presets for every new business. Evidence: provisioning test; live dashboard showed USD 10,000 cash, 5,000 revenue, 7,000 costs, net burn 2,000, runway 5.
- [ ] **2.7** **Blocked:** apply migrations to the hosted Supabase project — tracked as 4.4.
- [ ] **2.8** **Pending (hosted):** verify the pooled `DATABASE_URL` works from Vercel — tracked as 4.5.

### Authentication and authorisation *(was 3.1–3.7, 6.12, 6.14)*
- [x] **2.9** Supabase Auth sign-up (consent first), email confirmation, sign-in, logout, protected routes (`proxy.ts`, `auth.getUser()` on the server). Evidence (local stack): sign-up → confirmation email in Mailpit → `/auth/confirm` → dashboard with demo business; logout; signed-out `/dashboard` redirects to `/login?from=…`; unconfirmed account gets `email_not_confirmed`; login after logout shows saved data.
- [x] **2.10** Password recovery with Supabase (`/forgot-password`, `/auth/confirm`, `/reset-password`); no recovery link is shown or logged by the app. Evidence (local stack): recovery email in Mailpit → new password set → old password rejected (400), new accepted (200).
- [x] **2.11** Consent: PICS-v2 shown before the form; consent time and version carried from sign-up metadata into `users`; missing, stale-version, future-dated or unconfirmed accounts are refused. Evidence: `lib/provision.test.ts`.
- [x] **2.12** Access control: `requireBusinessAccess` (owner or collaborator), `requireBusinessOwner`, queries scoped by `business_id`; RLS deny-by-default for the Data API. Evidence: `lib/access.test.ts`, `lib/workflows.test.ts`; live: another user's business export returned 404 and a forged `bp_business` cookie showed only their own business.

### Calculations and core workflow *(was 4.x, 5.1–5.16)*
- [x] **2.13** Calculation library with rounding helper; tests for month rollover, one-off timing, exact-zero balance, first negative month, zero burn, horizon limit, rounding of halves and negative values, scenario growth, warnings. Evidence: `npm test` — 35 tests pass (`lib/calc/*.test.ts`).
- [x] **2.14** Business creation, opening cash and start month, revenue and expense CRUD with categories, recurring and one-off items, dashboard KPIs, cash-flow table and chart. Evidence: tests; live: editing an expense changed net burn to USD 1,000 and persisted after logout/login; Free shows 6 rows, Founder 24; empty business shows an explanatory notice.
- [x] **2.15** CSV export for cash flow, revenue and expenses with category names. Evidence: live fetches returned expected rows; foreign business returned 404.

**Phase 2 check:** build and tests pass; core flows verified on the local stack. Remaining items need the hosted project (4.4, 4.5).

---

## Phase 3 — Features, demo plans, collaborators, frontend

### Planning features *(was 5.17–5.22)*
- [x] **3.1** Editable Base/Cautious/Growth presets, custom scenarios (plan-gated, editable, deletable), side-by-side comparison of up to 3 with a selection control. Evidence: tests for gating and hundredth-percent validation; live: custom scenario created, comparison showed Base 10 months, Cautious 5, Growth more than 24; `?compare=` selection returned 2 scenarios.
- [x] **3.2** Milestones (title, date, status, notes) and decision log (expected impact, actual outcome added later, notes, search, month filter). Evidence: live add/edit/delete of a milestone; decision created with a note, outcome added later; search `q=freelancer` returned one match, invalid month redirected.
- [x] **3.3** Warnings (runway, rising costs, falling revenue) gated by plan. Evidence: unit tests; live Free dashboard showed the runway warning only.
- [x] **3.4** Search and filter on items (client-side name, month, category), decisions (server-side), export. Evidence: decisions filter and exports live; items search, category and month filters exercised in a browser on the local stack (match, no-match message, reset).

### Demo plans and limits *(was 6.1–6.6; Stripe tasks 6.7–6.10 removed)*
- [x] **3.5** `/pricing` with fictional prices, "Assignment demo — no payment is collected", confirmation step, `setDemoPlan` server action, limits enforced on the server (owned businesses, forecast months, custom scenarios, warnings). Evidence: `lib/workflows.test.ts`; live Free → Founder (24 rows, runway 10) → Adviser (second business created, "2 of 10") → Free (6 rows, both businesses kept).
- [x] **3.6** Payment-provider code, dependencies and variables removed (`/api/checkout`, Stripe/Clerk/Neon packages, env names, request-security helper). Evidence: `git grep` for stripe, clerk, sqlite, neon finds no source references.

### Collaborators and deletion
- [x] **3.7** Owner grants and revokes access by email of an existing account; collaborators edit planning data but cannot invite, revoke, delete the business or change plans; shared businesses follow the **owner's** plan. Evidence: tests; live: collaborator saw the shared business with 24 rows while on Free, no Sharing/Delete sections. **Limit:** the invitee must have signed in at least once; no invitation email.
- [x] **3.8** Delete business (owner, not the last one) and delete account and data (confirmed). Evidence: tests; live: deleting a collaborator account removed the Auth user, profile and owned business and left the other user's shared business intact. A first attempt failed on a lock conflict and was fixed (Auth user deleted before the data transaction).

### Frontend *(was 5.1–5.5, 6.13)*
- [x] **3.9** Existing palette and identity preserved. Repairs: active navigation state, pending/disabled and "Saved." feedback on every form, delete confirmation on items, router refresh instead of page reloads, currency chart axis, whole-month runway text, fictional-data notice, mobile KPI grid, explanatory desktop-only message, per-page titles, scenario comparison moved above editors. Evidence: all 13 pages loaded with one `h1`, language and no unlabelled controls; visual review of dashboard, cash flow, revenue, scenarios, settings and pricing at 1440px; full responsive and accessibility results are in 4.1.
- [x] **3.10** Keyboard, contrast and responsive verification completed locally; see 4.1.

**Phase 3 check:** tests and build pass; features verified on the local stack except where noted.

---

## Phase 4 — Local verification, hosted setup, handoff

### Local (done on the local stack)
- [x] **4.1** Keyboard, focus, contrast, labels, validation and responsive checks (was 3.10, 6.13). Evidence: sign-in completed with keyboard only; every tab stop on the dashboard (22 stops) and settings (41 stops) showed a solid navy outline, with logical order and no keyboard trap; a skip-to-content link was added and verified (focus lands on the first control in the page); contrast audit of all rendered text on 11 page states at 1440px found 0 failures against 4.5:1 (3:1 for large text); all 13 pages have one `h1`, language set, no unlabelled controls; invalid amount shows a text error; wrong password shows "Email or password is incorrect."; no horizontal overflow on 13 pages at 1440, 1024 and 390px after fixing one header overflow at 390px. Tab-size targets rely on the global 24px minimum.
- [x] **4.2** Items filters in a browser: name search, category filter, month filter, empty-result message, delete confirmation (Keep restores the row). Items are now sorted by month then name.
- [x] **4.3** Hosted migration prepared for review (nothing run remotely). Both migration files were applied to fresh scratch databases on the local stack, including one with an `auth` schema: 11 tables, RLS on, `users → auth.users` foreign key, Data API roles lose access to BootPulse tables only (another public table kept its grant), migration history has 2 rows, re-running changes nothing. The Data API revoke was narrowed from the whole public schema to the 11 BootPulse tables.

### Hosted (blocked on you)
- [ ] **4.4** **Blocked:** apply migrations to the hosted project: `DIRECT_URL` in `.env.local` plus an explicit go-ahead, then `npm run db:migrate`. *(was 2.7)*
- [ ] **4.5** **Pending after 4.4:** verify the pooled `DATABASE_URL` from Vercel with `prepare: false`. *(was 2.8)*
- [ ] **4.6** **Blocked (needs team):** hosted Supabase Auth settings: Site URL, redirect URLs, confirm-signup and recovery templates from `supabase/templates/`, minimum password length 8, email confirmation on.
- [ ] **4.7** **Blocked (needs team):** email delivery — custom SMTP with a verified sending domain (the built-in mailer only reaches project team members and is rate limited). Deferred until the other work is complete.
- [ ] **4.8** **Blocked (needs team):** Vercel variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and deployment from `main`. *(was 6.15–6.17)*
- [ ] **4.9** **Pending after 4.4–4.8:** live email verification — confirmation and recovery emails delivered and working end to end. Local capture (Mailpit) passed; delivery is unverified.
- [ ] **4.10** **Pending after 4.4–4.8:** hosted walkthrough — sign-up → demo dashboard → edit cash/revenue/expenses → compare scenarios → log decision → export → Free → Founder → Adviser → Free → logout/login → account deletion, with no browser or server errors. *(was Gate 6D)*
- [ ] **4.11** **Pending:** final reconciliation of `PRD.md`, `tasklist.md`, `README.md` and `.env.example` against the hosted deployment.

---

## Deferred

- Email invitations for people without an account; read-only collaborators; ownership transfer.
- Email alerts, spreadsheet import, more scenario templates, multi-currency.
- Any real payment integration.

Out of scope at every stage: banking integrations, payroll systems, advanced accounting.

---

## Reopened claims *(from the previous list)*

| Old item | Previous claim | Why reopened |
|---|---|---|
| 3.1–3.7, Gate 3A/3B | Auth done with Clerk / local sessions | Both superseded; Gate 3B was never ticked. Replaced by 2.9–2.12 with new evidence. |
| 6.7–6.10 | Stripe tasks ticked "Skipped" | Not implemented by decision; now removed (3.6). |
| Gate 6B | Ticked; audit file said blocked | Contradiction. Payments removed; plan switching verified in 3.5. |
| 6.11 / Gate 6C | Deletes Clerk user and Neon rows | Described services never used. Replaced by 3.8. |
| 6.12 | Ownership test, 22 tests pass | Tests rewritten for Postgres roles; 35 tests now pass. Earlier run could not be reproduced (native crash). |
| 6.13, 6.14 | Accessibility and privacy audits passed | Evidence files described the SQLite/local-auth build and were removed from the working tree (still in Git history at commit `1266f17`). Redone as 3.9, 4.1, 2.11. |
| 6.15 | Pushed to GitHub | Not re-verifiable here; the team pushes manually. |
| 6.16, 6.17, Gate 6D | Deployment blocked | Blocker (SQLite on Vercel) removed by this migration; hosted deployment remains pending (4.4–4.10). |

---

## Substitution Log

| # | Original plan | Now | Reason | Tasks |
|---|---|---|---|---|
| 1 | Neon PostgreSQL | Supabase PostgreSQL (approved) | Hosting project already created; same Postgres, pooled connection | 2.4, 2.5 |
| 2 | Interim: local SQLite file | Supabase PostgreSQL | SQLite needs a writable persistent disk and a native module; neither works on Vercel | 2.4, 2.5 |
| 3 | Clerk | Supabase Auth | Same project as the database; includes confirmation and recovery email | 2.9, 2.10 |
| 4 | Interim: local email/password auth with a reset stub | Supabase Auth | Password reset is an assignment requirement | 2.10 |
| 5 | Stripe Checkout in test mode and webhooks | Assignment-only simulated demo plans; no payment provider | Project decision: nothing is charged or collected. **Differs from the assignment's "test payments"**; recorded honestly. | 3.5, 3.6 |
| 6 | Row Level Security as the access check | Explicit server-side authorisation plus deny-all RLS | Direct Drizzle connections do not carry the user's RLS context | 2.4, 2.12 |
| 7 | Collaborator role deferred to Phase 2 | Collaborator access in the MVP | Required by the assignment prompt | 3.7 |
| 8 | Adviser plan "coming soon" | Adviser demo plan selectable, up to 10 owned businesses | Required by the assignment prompt | 3.5 |
