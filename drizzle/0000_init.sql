CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"cash_start_month" date NOT NULL,
	"cash_balance_cents" integer NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	CONSTRAINT "categories_kind_check" CHECK ("categories"."kind" in ('revenue', 'expense'))
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"decided_on" date NOT NULL,
	"expected_impact" text NOT NULL,
	"actual_outcome" text
);
--> statement-breakpoint
CREATE TABLE "expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"frequency" text NOT NULL,
	"start_month" date NOT NULL,
	CONSTRAINT "expense_items_amount_non_negative" CHECK ("expense_items"."amount_cents" >= 0),
	CONSTRAINT "expense_items_frequency_check" CHECK ("expense_items"."frequency" in ('monthly', 'one_off'))
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"title" text NOT NULL,
	"target_date" date NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "milestones_status_check" CHECK ("milestones"."status" in ('planned', 'done'))
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"milestone_id" uuid,
	"decision_id" uuid,
	"body" text NOT NULL,
	CONSTRAINT "notes_exactly_one_parent" CHECK (("notes"."milestone_id" is not null and "notes"."decision_id" is null) or ("notes"."milestone_id" is null and "notes"."decision_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "revenue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"frequency" text NOT NULL,
	"start_month" date NOT NULL,
	CONSTRAINT "revenue_items_amount_non_negative" CHECK ("revenue_items"."amount_cents" >= 0),
	CONSTRAINT "revenue_items_frequency_check" CHECK ("revenue_items"."frequency" in ('monthly', 'one_off'))
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"revenue_growth_pct" numeric(6, 2) DEFAULT 0 NOT NULL,
	"price_change_pct" numeric(6, 2) DEFAULT 0 NOT NULL,
	"revenue_loss_pct" numeric(6, 2) DEFAULT 0 NOT NULL,
	"extra_recurring_cost_cents" integer DEFAULT 0 NOT NULL,
	"extra_one_off_cost_cents" integer DEFAULT 0 NOT NULL,
	"extra_one_off_month" date,
	CONSTRAINT "scenarios_kind_check" CHECK ("scenarios"."kind" in ('base', 'cautious', 'growth', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_plan_check" CHECK ("subscriptions"."plan" in ('free', 'founder', 'adviser'))
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "team_members_business_user_unique" UNIQUE("business_id","user_id"),
	CONSTRAINT "team_members_role_check" CHECK ("team_members"."role" in ('owner', 'collaborator'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"privacy_consent_at" timestamp with time zone NOT NULL,
	"consent_version" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_items" ADD CONSTRAINT "revenue_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_one_owner" ON "team_members" USING btree ("business_id") WHERE "team_members"."role" = 'owner';