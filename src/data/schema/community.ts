/** Tables for handoffs and the community modules. Every row carries campus_id. */
import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import type { PostData } from "../community-types";
import { campuses, listings, profiles } from "./core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const updated = () => ts("updated_at").notNull().defaultNow();

export const handoffPhase = pgEnum("handoff_phase", ["move_out", "move_in"]);
export const handoffStatus = pgEnum("handoff_status", ["pending", "completed", "cancelled"]);
export const postKind = pgEnum("post_kind", ["sub", "ride", "meal"]);
export const postStatus = pgEnum("post_status", ["open", "full", "closed", "cancelled"]);
export const swapStatus = pgEnum("swap_status", ["open", "proposed", "matched", "done", "cancelled"]);

export const handoffs = pgTable(
  "handoffs",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull(),
    listingId: text("listing_id").notNull(),
    sellerId: text("seller_id").notNull().references(() => profiles.id),
    buyerId: text("buyer_id").notNull().references(() => profiles.id),
    source: text("source").$type<"dibs" | "auction">().notNull(),
    dibId: text("dib_id"),
    amountCents: integer("amount_cents").notNull(),
    phase: handoffPhase("phase").notNull().default("move_out"),
    scheduledAt: ts("scheduled_at"),
    status: handoffStatus("status").notNull().default("pending"),
    completedAt: ts("completed_at"),
    paymentMethod: text("payment_method"),
    paymentSentAt: ts("payment_sent_at"),
    paymentReceivedAt: ts("payment_received_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    foreignKey({ columns: [t.listingId, t.campusId], foreignColumns: [listings.id, listings.campusId] }).onDelete("cascade"),
    uniqueIndex("handoffs_one_pending_uq").on(t.listingId).where(sql`${t.status} = 'pending'`),
    index("handoffs_buyer_idx").on(t.buyerId),
    index("handoffs_seller_idx").on(t.sellerId),
    check("handoffs_amount_nonneg", sql`${t.amountCents} >= 0`),
  ],
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    kind: postKind("kind").notNull(),
    ownerId: text("owner_id").notNull().references(() => profiles.id),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    capacity: integer("capacity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    startsAt: ts("starts_at").notNull(),
    imageUrl: text("image_url"),
    data: jsonb("data").$type<PostData>().notNull(),
    status: postStatus("status").notNull().default("open"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("community_posts_campus_kind_idx").on(t.campusId, t.kind, t.startsAt),
    check("community_posts_capacity", sql`${t.capacity} between 1 and 50`),
    check("community_posts_price", sql`${t.unitPriceCents} >= 0`),
  ],
);

export const communityMembers = pgTable(
  "community_members",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
    campusId: text("campus_id").notNull(),
    userId: text("user_id").notNull().references(() => profiles.id),
    quantity: integer("quantity").notNull().default(1),
    status: text("status").$type<"joined" | "left">().notNull().default("joined"),
    paymentMethod: text("payment_method"),
    paymentSentAt: ts("payment_sent_at"),
    paymentReceivedAt: ts("payment_received_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("community_members_one_active_uq").on(t.postId, t.userId).where(sql`${t.status} = 'joined'`),
    index("community_members_user_idx").on(t.userId),
  ],
);

export const swapRequests = pgTable(
  "swap_requests",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    userId: text("user_id").notNull().references(() => profiles.id),
    course: text("course").notNull(),
    haveSection: text("have_section").notNull(),
    wantSection: text("want_section").notNull(),
    status: swapStatus("status").notNull().default("open"),
    cycleId: text("cycle_id"),
    autoAccept: boolean("auto_accept").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("swap_requests_course_idx").on(t.campusId, t.course, t.status)],
);

export const swapCycles = pgTable("swap_cycles", {
  id: text("id").primaryKey(),
  campusId: text("campus_id").notNull().references(() => campuses.id),
  course: text("course").notNull(),
  requestIds: text("request_ids").array().notNull(),
  confirmedBy: text("confirmed_by").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").$type<"proposed" | "matched" | "cancelled">().notNull().default("proposed"),
  swapAt: ts("swap_at"),
  createdAt: created(),
});
