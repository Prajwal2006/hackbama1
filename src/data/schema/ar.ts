/** AR models for listings. Postgres stores the small part-list spec; the GLB is generated on demand. */
import { foreignKey, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ArDims, ArSpec } from "@/features/ar/spec";
import { listings, profiles } from "./core";

export const arModels = pgTable(
  "ar_models",
  {
    listingId: text("listing_id").primaryKey(),
    campusId: text("campus_id").notNull(),
    sellerId: text("seller_id").notNull().references(() => profiles.id),
    spec: jsonb("spec").$type<ArSpec>().notNull(),
    dimensionsCm: jsonb("dimensions_cm").$type<ArDims>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [foreignKey({ columns: [t.listingId, t.campusId], foreignColumns: [listings.id, listings.campusId] }).onDelete("cascade")],
);
