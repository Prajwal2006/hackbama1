/** Furniture Bank tables. One active reservation per item is enforced by status + row locks. */
import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { BankEvent } from "../bank-types";
import { campuses, profiles } from "./core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const bankItems = pgTable(
  "bank_items",
  {
    id: text("id").primaryKey(),
    inventoryCode: text("inventory_code").notNull(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    consignorId: text("consignor_id").notNull().references(() => profiles.id),
    title: text("title").notNull(),
    category: text("category").notNull(),
    condition: text("condition").$type<"like_new" | "good" | "fair">().notNull(),
    widthCm: integer("width_cm").notNull(),
    depthCm: integer("depth_cm").notNull(),
    heightCm: integer("height_cm").notNull(),
    priceCents: integer("price_cents").notNull(),
    retailCents: integer("retail_cents"),
    imageUrl: text("image_url"),
    storageLocation: text("storage_location"),
    status: text("status").$type<"pending" | "available" | "reserved" | "delivered" | "retired">().notNull().default("available"),
    cycles: integer("cycles").notNull().default(0),
    history: jsonb("history").$type<BankEvent[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bank_items_code_uq").on(t.campusId, t.inventoryCode),
    index("bank_items_campus_status_idx").on(t.campusId, t.status),
    check("bank_items_price_nonneg", sql`${t.priceCents} >= 0`),
  ],
);

export const bankReservations = pgTable(
  "bank_reservations",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    buyerId: text("buyer_id").notNull().references(() => profiles.id),
    itemIds: text("item_ids").array().notNull(),
    totalCents: integer("total_cents").notNull(),
    moveInDate: text("move_in_date").notNull(),
    stage: text("stage").$type<"reserved" | "stored" | "delivered" | "returned" | "cancelled">().notNull().default("reserved"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("bank_reservations_buyer_idx").on(t.buyerId)],
);
