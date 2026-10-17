/**
 * Drizzle schema for Neon Postgres.
 *
 * Tenant isolation is enforced in the database, not just the app:
 * every tenant-scoped row carries `campus_id`, and child rows reference
 * listings by the composite (id, campus_id), so a bid/dib/save can never point
 * at a listing on a different campus than the row claims.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const updated = () => ts("updated_at").notNull().defaultNow();

// ——— Auth.js tables (shape required by @auth/drizzle-adapter) ———

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: ts("emailVerified"),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: ts("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: ts("expires").notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ——— Marketplace ———

export const saleMode = pgEnum("sale_mode", ["fixed", "auction", "free"]);
export const listingStatus = pgEnum("listing_status", ["active", "reserved", "sold", "closed", "cancelled"]);
export const pickupMode = pgEnum("pickup_mode", ["now", "scheduled", "flexible"]);
export const bidStatus = pgEnum("bid_status", ["active", "outbid", "winning", "withdrawn", "rejected"]);
export const dibStatus = pgEnum("dib_status", ["active", "completed", "expired", "cancelled"]);
export const auctionOutcome = pgEnum("auction_outcome", ["won", "reserve_not_met", "no_bids", "bought_now"]);

/** Mirrors `src/config/campuses.ts` (config stays the source of truth; this anchors FKs). */
export const campuses = pgTable("campuses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  emailDomains: text("email_domains").array().notNull(),
  timezone: text("timezone").notNull(),
  createdAt: created(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    displayName: text("display_name").notNull(),
    email: text("email"),
    avatarUrl: text("avatar_url"),
    verifiedAt: ts("verified_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("profiles_campus_idx").on(t.campusId)],
);

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    sellerId: text("seller_id").notNull().references(() => profiles.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull(),
    condition: text("condition").notNull(),
    saleMode: saleMode("sale_mode").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    isFree: boolean("is_free").notNull().default(false),
    currency: text("currency").notNull().default("USD"),
    imageUrls: text("image_urls").array().notNull().default(sql`'{}'::text[]`),
    status: listingStatus("status").notNull().default("active"),
    pickupMode: pickupMode("pickup_mode").notNull(),
    handoffStart: ts("handoff_start"),
    handoffEnd: ts("handoff_end"),
    locationHint: text("location_hint"),
    pickupSpotId: text("pickup_spot_id"),
    artSeed: integer("art_seed").notNull().default(0),
    // Auction
    startingBidCents: integer("starting_bid_cents"),
    minimumIncrementCents: integer("minimum_increment_cents"),
    auctionStartsAt: ts("auction_starts_at"),
    auctionEndsAt: ts("auction_ends_at"),
    reservePriceCents: integer("reserve_price_cents"),
    buyNowPriceCents: integer("buy_now_price_cents"),
    settledAt: ts("settled_at"),
    outcome: auctionOutcome("outcome"),
    winningBidId: text("winning_bid_id"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    unique("listings_id_campus_uq").on(t.id, t.campusId),
    index("listings_campus_status_idx").on(t.campusId, t.status, t.createdAt),
    index("listings_auction_due_idx").on(t.auctionEndsAt).where(sql`${t.saleMode} = 'auction' and ${t.settledAt} is null`),
    check("listings_price_nonneg", sql`${t.priceCents} >= 0`),
    check("listings_free_consistent", sql`(${t.saleMode} = 'free') = ${t.isFree} and (not ${t.isFree} or ${t.priceCents} = 0)`),
    check(
      "listings_auction_fields",
      sql`${t.saleMode} <> 'auction' or (
        ${t.startingBidCents} > 0 and ${t.minimumIncrementCents} > 0
        and ${t.auctionStartsAt} is not null and ${t.auctionEndsAt} > ${t.auctionStartsAt}
        and (${t.reservePriceCents} is null or ${t.reservePriceCents} >= ${t.startingBidCents})
        and (${t.buyNowPriceCents} is null or ${t.buyNowPriceCents} > ${t.startingBidCents})
      )`,
    ),
  ],
);

export const bids = pgTable(
  "bids",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull(),
    listingId: text("listing_id").notNull(),
    bidderId: text("bidder_id").notNull().references(() => profiles.id),
    amountCents: integer("amount_cents").notNull(),
    status: bidStatus("status").notNull().default("active"),
    idempotencyKey: text("idempotency_key"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    foreignKey({ columns: [t.listingId, t.campusId], foreignColumns: [listings.id, listings.campusId] }).onDelete("cascade"),
    uniqueIndex("bids_idempotency_uq").on(t.bidderId, t.idempotencyKey),
    index("bids_listing_amount_idx").on(t.listingId, t.amountCents),
    index("bids_bidder_idx").on(t.bidderId, t.createdAt),
    check("bids_amount_pos", sql`${t.amountCents} > 0`),
  ],
);

export const dibs = pgTable(
  "dibs",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull(),
    listingId: text("listing_id").notNull(),
    buyerId: text("buyer_id").notNull().references(() => profiles.id),
    status: dibStatus("status").notNull().default("active"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    foreignKey({ columns: [t.listingId, t.campusId], foreignColumns: [listings.id, listings.campusId] }).onDelete("cascade"),
    // At most one live reservation per listing, enforced by Postgres.
    uniqueIndex("dibs_one_active_uq").on(t.listingId).where(sql`${t.status} = 'active'`),
    index("dibs_buyer_idx").on(t.buyerId, t.createdAt),
    index("dibs_expiry_idx").on(t.expiresAt).where(sql`${t.status} = 'active'`),
  ],
);

export const saves = pgTable(
  "saves",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull(),
    listingId: text("listing_id").notNull(),
    userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [
    foreignKey({ columns: [t.listingId, t.campusId], foreignColumns: [listings.id, listings.campusId] }).onDelete("cascade"),
    uniqueIndex("saves_user_listing_uq").on(t.userId, t.listingId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    listingId: text("listing_id"),
    readAt: ts("read_at"),
    createdAt: created(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);
