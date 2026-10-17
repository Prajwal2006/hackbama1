CREATE TYPE "public"."auction_outcome" AS ENUM('won', 'reserve_not_met', 'no_bids', 'bought_now');--> statement-breakpoint
CREATE TYPE "public"."bid_status" AS ENUM('active', 'outbid', 'winning', 'withdrawn', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."dib_status" AS ENUM('active', 'completed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'reserved', 'sold', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pickup_mode" AS ENUM('now', 'scheduled', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."sale_mode" AS ENUM('fixed', 'auction', 'free');--> statement-breakpoint
CREATE TABLE "accounts" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"bidder_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "bid_status" DEFAULT 'active' NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bids_amount_pos" CHECK ("bids"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "campuses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"email_domains" text[] NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dibs" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"status" "dib_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"sale_mode" "sale_mode" NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"image_urls" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"pickup_mode" "pickup_mode" NOT NULL,
	"handoff_start" timestamp with time zone,
	"handoff_end" timestamp with time zone,
	"location_hint" text,
	"pickup_spot_id" text,
	"art_seed" integer DEFAULT 0 NOT NULL,
	"starting_bid_cents" integer,
	"minimum_increment_cents" integer,
	"auction_starts_at" timestamp with time zone,
	"auction_ends_at" timestamp with time zone,
	"reserve_price_cents" integer,
	"buy_now_price_cents" integer,
	"settled_at" timestamp with time zone,
	"outcome" "auction_outcome",
	"winning_bid_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_id_campus_uq" UNIQUE("id","campus_id"),
	CONSTRAINT "listings_price_nonneg" CHECK ("listings"."price_cents" >= 0),
	CONSTRAINT "listings_free_consistent" CHECK (("listings"."sale_mode" = 'free') = "listings"."is_free" and (not "listings"."is_free" or "listings"."price_cents" = 0)),
	CONSTRAINT "listings_auction_fields" CHECK ("listings"."sale_mode" <> 'auction' or (
        "listings"."starting_bid_cents" > 0 and "listings"."minimum_increment_cents" > 0
        and "listings"."auction_starts_at" is not null and "listings"."auction_ends_at" > "listings"."auction_starts_at"
        and ("listings"."reserve_price_cents" is null or "listings"."reserve_price_cents" >= "listings"."starting_bid_cents")
        and ("listings"."buy_now_price_cents" is null or "listings"."buy_now_price_cents" > "listings"."starting_bid_cents")
      ))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"listing_id" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_profiles_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_campus_id_listings_id_campus_id_fk" FOREIGN KEY ("listing_id","campus_id") REFERENCES "public"."listings"("id","campus_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dibs" ADD CONSTRAINT "dibs_buyer_id_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dibs" ADD CONSTRAINT "dibs_listing_id_campus_id_listings_id_campus_id_fk" FOREIGN KEY ("listing_id","campus_id") REFERENCES "public"."listings"("id","campus_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_listing_id_campus_id_listings_id_campus_id_fk" FOREIGN KEY ("listing_id","campus_id") REFERENCES "public"."listings"("id","campus_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bids_idempotency_uq" ON "bids" USING btree ("bidder_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "bids_listing_amount_idx" ON "bids" USING btree ("listing_id","amount_cents");--> statement-breakpoint
CREATE INDEX "bids_bidder_idx" ON "bids" USING btree ("bidder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dibs_one_active_uq" ON "dibs" USING btree ("listing_id") WHERE "dibs"."status" = 'active';--> statement-breakpoint
CREATE INDEX "dibs_buyer_idx" ON "dibs" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "dibs_expiry_idx" ON "dibs" USING btree ("expires_at") WHERE "dibs"."status" = 'active';--> statement-breakpoint
CREATE INDEX "listings_campus_status_idx" ON "listings" USING btree ("campus_id","status","created_at");--> statement-breakpoint
CREATE INDEX "listings_auction_due_idx" ON "listings" USING btree ("auction_ends_at") WHERE "listings"."sale_mode" = 'auction' and "listings"."settled_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "profiles_campus_idx" ON "profiles" USING btree ("campus_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saves_user_listing_uq" ON "saves" USING btree ("user_id","listing_id");