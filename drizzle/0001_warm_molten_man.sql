CREATE TYPE "public"."handoff_phase" AS ENUM('move_out', 'move_in');--> statement-breakpoint
CREATE TYPE "public"."handoff_status" AS ENUM('pending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_kind" AS ENUM('sub', 'ride', 'meal');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('open', 'full', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."swap_status" AS ENUM('open', 'proposed', 'matched', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "email_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"campus_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"campus_id" text NOT NULL,
	"user_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'joined' NOT NULL,
	"payment_method" text,
	"payment_sent_at" timestamp with time zone,
	"payment_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"kind" "post_kind" NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"capacity" integer NOT NULL,
	"unit_price_cents" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"image_url" text,
	"data" jsonb NOT NULL,
	"status" "post_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_posts_capacity" CHECK ("community_posts"."capacity" between 1 and 50),
	CONSTRAINT "community_posts_price" CHECK ("community_posts"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "handoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"source" text NOT NULL,
	"dib_id" text,
	"amount_cents" integer NOT NULL,
	"phase" "handoff_phase" DEFAULT 'move_out' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"status" "handoff_status" DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"payment_method" text,
	"payment_sent_at" timestamp with time zone,
	"payment_received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "handoffs_amount_nonneg" CHECK ("handoffs"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "swap_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"course" text NOT NULL,
	"request_ids" text[] NOT NULL,
	"confirmed_by" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"swap_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swap_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"user_id" text NOT NULL,
	"course" text NOT NULL,
	"have_section" text NOT NULL,
	"want_section" text NOT NULL,
	"status" "swap_status" DEFAULT 'open' NOT NULL,
	"cycle_id" text,
	"auto_accept" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "hold_for_move_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_codes" ADD CONSTRAINT "email_codes_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_seller_id_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_buyer_id_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_listing_id_campus_id_listings_id_campus_id_fk" FOREIGN KEY ("listing_id","campus_id") REFERENCES "public"."listings"("id","campus_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_cycles" ADD CONSTRAINT "swap_cycles_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_codes_email_idx" ON "email_codes" USING btree ("email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "community_members_one_active_uq" ON "community_members" USING btree ("post_id","user_id") WHERE "community_members"."status" = 'joined';--> statement-breakpoint
CREATE INDEX "community_members_user_idx" ON "community_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "community_posts_campus_kind_idx" ON "community_posts" USING btree ("campus_id","kind","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "handoffs_one_pending_uq" ON "handoffs" USING btree ("listing_id") WHERE "handoffs"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "handoffs_buyer_idx" ON "handoffs" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "handoffs_seller_idx" ON "handoffs" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "swap_requests_course_idx" ON "swap_requests" USING btree ("campus_id","course","status");