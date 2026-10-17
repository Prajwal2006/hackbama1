CREATE TABLE "bank_items" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_code" text NOT NULL,
	"campus_id" text NOT NULL,
	"consignor_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"width_cm" integer NOT NULL,
	"depth_cm" integer NOT NULL,
	"height_cm" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"retail_cents" integer,
	"image_url" text,
	"storage_location" text,
	"status" text DEFAULT 'available' NOT NULL,
	"cycles" integer DEFAULT 0 NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_items_price_nonneg" CHECK ("bank_items"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bank_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"campus_id" text NOT NULL,
	"buyer_id" text NOT NULL,
	"item_ids" text[] NOT NULL,
	"total_cents" integer NOT NULL,
	"move_in_date" text NOT NULL,
	"stage" text DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_items" ADD CONSTRAINT "bank_items_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_items" ADD CONSTRAINT "bank_items_consignor_id_profiles_id_fk" FOREIGN KEY ("consignor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reservations" ADD CONSTRAINT "bank_reservations_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_reservations" ADD CONSTRAINT "bank_reservations_buyer_id_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_items_code_uq" ON "bank_items" USING btree ("campus_id","inventory_code");--> statement-breakpoint
CREATE INDEX "bank_items_campus_status_idx" ON "bank_items" USING btree ("campus_id","status");--> statement-breakpoint
CREATE INDEX "bank_reservations_buyer_idx" ON "bank_reservations" USING btree ("buyer_id");