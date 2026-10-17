CREATE TABLE "ar_models" (
	"listing_id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"spec" jsonb NOT NULL,
	"dimensions_cm" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ar_models" ADD CONSTRAINT "ar_models_seller_id_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_models" ADD CONSTRAINT "ar_models_listing_id_campus_id_listings_id_campus_id_fk" FOREIGN KEY ("listing_id","campus_id") REFERENCES "public"."listings"("id","campus_id") ON DELETE cascade ON UPDATE no action;