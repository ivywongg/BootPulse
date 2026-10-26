-- Deny-by-default access for the Supabase Data API (PostgREST).
-- BootPulse reads and writes through server-side Drizzle connections only; the
-- signed-in user's identity and business role are checked in application code.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "revenue_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expense_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scenarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "milestones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Supabase only: tie users to auth.users and remove Data API grants. Skipped on plain Postgres (tests).
DO $$
BEGIN
  IF to_regnamespace('auth') IS NOT NULL THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_id_auth_users_fk"
      FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
  END IF;
END $$;
