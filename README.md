# BootPulse

Desktop-first cash-flow, runway and scenario-planning dashboard for bootstrapped founders. University assignment (MKTG 4150): all data is fictional and plans are an assignment demo with **no payment collected**.

- Requirements: [`PRD.md`](PRD.md). Work status and evidence: [`tasklist.md`](tasklist.md).
- Stack: Next.js (App Router), TypeScript, Tailwind, Drizzle ORM, Supabase (PostgreSQL + Auth), Vercel.

## Environment variables

Copy `.env.example` to `.env.local` (ignored by Git) and fill in values. Never commit real values and never put server secrets in `NEXT_PUBLIC_` variables.

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase publishable key |
| `NEXT_PUBLIC_APP_URL` | public | App origin used in email links (`http://localhost:3000` locally) |
| `DATABASE_URL` | server secret | Supabase pooled (transaction) connection string, port 6543 |
| `DIRECT_URL` | server secret | Direct or session-pooler connection string, port 5432, used only by `db:migrate` |
| `SUPABASE_SERVICE_ROLE_KEY` | server secret | Used only to delete the Auth user in Settings > Delete account |

## Run locally (no hosted services touched)

Requires Node 22+ and Docker.

```bash
npm install
npx supabase start          # local Auth, Postgres and email capture (Mailpit at http://127.0.0.1:54324)
npx supabase status         # shows the local keys and URLs
```

Put the local values in `.env.local` (publishable key and URL from `supabase status`; `DATABASE_URL` and `DIRECT_URL` are `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; `SUPABASE_SERVICE_ROLE_KEY` from the status output), then:

```bash
npm run db:migrate
npm run dev                 # http://localhost:3000
```

Sign up, then open the confirmation email in Mailpit. `supabase/config.toml` and `supabase/templates/` configure confirmation, recovery and password rules for the local stack.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest with in-memory Postgres (PGlite) running the real migrations |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | Generate a migration after editing `db/schema.ts` |
| `npm run db:migrate` | Apply `drizzle/` migrations to the database in `DIRECT_URL` (reads `.env.local`; never runs automatically) |
| `npm run db:seed -- <user-id>` | Add another fictional demo business for an existing user |

## Deploy checklist (hosted Supabase + Vercel)

1. **Migrations.** First run these read-only queries in the Supabase SQL editor: `select table_name from information_schema.tables where table_schema = 'public';` (must not list `users`, `businesses` or the other BootPulse tables) and `select * from drizzle.__drizzle_migrations;` (an error "schema does not exist" is expected on a fresh project). Then set `DIRECT_URL` locally to the hosted project's direct or session-pooler string and run `npm run db:migrate`. This creates the tables, enables row-level security with no policies, and revokes Data API access.
2. **Auth settings** (Supabase dashboard > Authentication):
   - Site URL: your Vercel URL. Redirect URLs: `<vercel-url>/**` and `http://localhost:3000/**`.
   - Email provider: confirm email on, minimum password length 8.
   - Email templates: paste `supabase/templates/confirmation.html` (Confirm signup) and `supabase/templates/recovery.html` (Reset password).
3. **Email delivery.** The built-in mailer only reaches project team members and is heavily rate limited. To email anyone, configure custom SMTP (Authentication > SMTP) with a sender on a domain you have verified with the email provider.
4. **Vercel region.** Set the project's Functions region next to the database (Tokyo, `hnd1`, for `ap-northeast-1`); each query costs a round trip, so a far-away region makes pages several seconds slower.
5. **Vercel project variables** (Production and Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL` (the Vercel URL), `DATABASE_URL` (pooled string), `SUPABASE_SERVICE_ROLE_KEY`. Redeploy after changing variables.
6. **Smoke test** on the live URL: sign up, confirm by email, dashboard shows the demo business, edit an item, switch demo plans, reset a password, delete the test account.

## Behaviour notes

- Sign-in and recovery use Supabase Auth; the app verifies the session with `auth.getUser()` on the server.
- Business data is accessed through a server-side Postgres connection, which does not carry the user's row-level-security context, so every action checks owner or collaborator access explicitly (see `lib/access.ts`).
- Demo plans change limits only. A collaborator's shared business follows the **owner's** plan.
- Collaborators are added by email and must already have signed in once; no invitation email is sent.
