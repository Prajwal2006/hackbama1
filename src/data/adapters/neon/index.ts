/**
 * Neon Postgres adapter (Drizzle).
 *
 * - Reads use the HTTP driver (one round trip, no connection to manage).
 * - Mutations that must be atomic open a short-lived WebSocket `Pool`, run one
 *   transaction with `SELECT … FOR UPDATE` on the listing row, then close it.
 *   This is Neon's recommended pattern for serverless functions.
 * - Domain checks are the same pure functions the mock adapter uses.
 */
import { neon, Pool } from "@neondatabase/serverless";
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import {
  bidderLabel,
  checkAuctionCancel,
  checkBid,
  checkBuyNow,
  computeSettlement,
  auctionPhase,
} from "@/features/auctions/domain";
import { checkClaim, dibsExpiry } from "@/features/dibs/domain";
import { checkHandoffAck, checkSchedule } from "@/features/community/domain";
import { getCampus } from "@/config/campuses";
import type { Handoff, HandoffView, PaymentMethod } from "../../community-types";
import { validateAuctionTiming } from "@/features/listings/schema";
import { formatCents } from "@/lib/money";
import { canTransact, canViewCampus } from "@/lib/policy";
import * as schema from "../../schema";
import { fail, ok, type MarketRepository, type Result } from "../../repository";
import type {
  Bid,
  Category,
  Condition,
  Dib,
  Listing,
  ListingFilter,
  ListingView,
  Notification,
  NotificationKind,
  Profile,
} from "../../types";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
const { listings, bids, dibs, saves, notifications, profiles, handoffs } = schema;

const nid = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

class Abort extends Error {
  constructor(public result: Result<never>) {
    super(result.ok ? "abort" : result.message);
  }
}

function isUniqueViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

type ListingRow = typeof listings.$inferSelect;

function toListing(r: ListingRow): Listing {
  return {
    id: r.id,
    campusId: r.campusId,
    sellerId: r.sellerId,
    title: r.title,
    description: r.description,
    category: r.category as Category,
    condition: r.condition as Condition,
    saleMode: r.saleMode,
    priceCents: r.priceCents,
    isFree: r.isFree,
    currency: "USD",
    imageUrls: r.imageUrls,
    status: r.status,
    pickupMode: r.pickupMode,
    handoffStart: r.handoffStart,
    handoffEnd: r.handoffEnd,
    locationHint: r.locationHint,
    pickupSpotId: r.pickupSpotId,
    holdForMoveIn: r.holdForMoveIn,
    artSeed: r.artSeed,
    auction:
      r.saleMode === "auction"
        ? {
            startingBidCents: r.startingBidCents!,
            minimumIncrementCents: r.minimumIncrementCents!,
            auctionStartsAt: r.auctionStartsAt!,
            auctionEndsAt: r.auctionEndsAt!,
            reservePriceCents: r.reservePriceCents,
            buyNowPriceCents: r.buyNowPriceCents,
            settledAt: r.settledAt,
            outcome: r.outcome,
            winningBidId: r.winningBidId,
          }
        : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function toBid(r: typeof bids.$inferSelect): Bid {
  return { ...r };
}
function toDib(r: typeof dibs.$inferSelect): Dib {
  return { ...r };
}

const liveBid = sql`b.status not in ('withdrawn', 'rejected')`;
const viewColumns = {
  listing: listings,
  sellerName: profiles.displayName,
  sellerAvatar: profiles.avatarUrl,
  sellerVerifiedAt: profiles.verifiedAt,
  bidCount: sql<number>`(select count(*)::int from bids b where b.listing_id = ${listings.id} and ${liveBid})`,
  highestBidCents: sql<number | null>`(select max(b.amount_cents)::int from bids b where b.listing_id = ${listings.id} and ${liveBid})`,
  saveCount: sql<number>`(select count(*)::int from saves s where s.listing_id = ${listings.id})`,
};

type ViewRow = {
  listing: ListingRow;
  sellerName: string | null;
  sellerAvatar: string | null;
  sellerVerifiedAt: Date | null;
  bidCount: number;
  highestBidCents: number | null;
  saveCount: number;
};

function toView(r: ViewRow): ListingView {
  return {
    ...toListing(r.listing),
    seller: {
      id: r.listing.sellerId,
      displayName: r.sellerName ?? "Student",
      avatarUrl: r.sellerAvatar,
      verifiedAt: r.sellerVerifiedAt,
    },
    bidCount: Number(r.bidCount),
    highestBidCents: r.highestBidCents === null ? null : Number(r.highestBidCents),
    saveCount: Number(r.saveCount),
  };
}

async function selectViews(db: Db, where: SQL | undefined, order: SQL[] = [desc(listings.createdAt)], limit = 200) {
  const rows = await db
    .select(viewColumns)
    .from(listings)
    .leftJoin(profiles, eq(profiles.id, listings.sellerId))
    .where(where)
    .orderBy(...order)
    .limit(limit);
  return (rows as ViewRow[]).map(toView);
}

async function viewById(db: Db, id: string) {
  return (await selectViews(db, eq(listings.id, id), undefined, 1))[0] ?? null;
}

function insertHandoff(
  db: Db,
  h: { campusId: string; listingId: string; sellerId: string; buyerId: string; source: "dibs" | "auction"; amountCents: number; dibId: string | null },
) {
  return db.insert(handoffs).values({ id: nid("ho"), ...h });
}

function toHandoff(r: typeof handoffs.$inferSelect): Handoff {
  return { ...r, paymentMethod: r.paymentMethod as PaymentMethod | null };
}

function insertNotification(
  db: Db,
  n: { campusId: string; userId: string; kind: NotificationKind; title: string; body: string; listingId: string | null },
) {
  return db.insert(notifications).values({ id: nid("ntf"), ...n });
}

export function createNeonRepository(databaseUrl: string): MarketRepository {
  const http = drizzleHttp({ client: neon(databaseUrl), schema }) as unknown as Db;

  async function tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const db = drizzleWs({ client: pool, schema });
      return await db.transaction(async (t) => fn(t as unknown as Db));
    } finally {
      await pool.end();
    }
  }

  async function guarded<T>(fn: (db: Db) => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await tx(fn);
    } catch (e) {
      if (e instanceof Abort) return e.result;
      if (isUniqueViolation(e)) return fail("conflict", "Someone else got there first.");
      throw e;
    }
  }

  async function lockListing(db: Db, id: string) {
    const [row] = await db.select().from(listings).where(eq(listings.id, id)).for("update");
    return row ? toListing(row) : null;
  }

  async function highestBid(db: Db, listingId: string): Promise<Bid | null> {
    const [row] = await db
      .select()
      .from(bids)
      .where(and(eq(bids.listingId, listingId), inArray(bids.status, ["active", "outbid", "winning"])))
      .orderBy(desc(bids.amountCents), bids.createdAt)
      .limit(1);
    return row ? toBid(row) : null;
  }

  async function settleLocked(db: Db, l: Listing, now: Date): Promise<boolean> {
    if (!l.auction || l.auction.settledAt || l.status === "cancelled") return false;
    if (auctionPhase(l, now) !== "ended") return false;
    const rows = (await db.select().from(bids).where(eq(bids.listingId, l.id))).map(toBid);
    const result = computeSettlement(l, rows);
    for (const [bidId, status] of result.bidStatuses) {
      await db.update(bids).set({ status, updatedAt: now }).where(eq(bids.id, bidId));
    }
    await db
      .update(listings)
      .set({
        status: result.listingStatus,
        settledAt: now,
        outcome: result.outcome,
        winningBidId: result.winningBid?.id ?? null,
        updatedAt: now,
      })
      .where(and(eq(listings.id, l.id), isNull(listings.settledAt)));
    const price = result.winningBid ? formatCents(result.winningBid.amountCents) : null;
    if (result.winningBid) {
      await insertHandoff(db, {
        campusId: l.campusId, listingId: l.id, sellerId: l.sellerId, buyerId: result.winningBid.bidderId,
        source: "auction", amountCents: result.winningBid.amountCents, dibId: null,
      });
      await insertNotification(db, {
        campusId: l.campusId, userId: result.winningBid.bidderId, kind: "auction_won", listingId: l.id,
        title: "You won! 🎉", body: `${l.title} is yours for ${price}. Message the seller to set up pickup.`,
      });
      await insertNotification(db, {
        campusId: l.campusId, userId: l.sellerId, kind: "auction_sold", listingId: l.id,
        title: "Auction sold", body: `${l.title} sold for ${price}.`,
      });
    } else {
      await insertNotification(db, {
        campusId: l.campusId, userId: l.sellerId, kind: "auction_unsold", listingId: l.id,
        title: "Auction closed without a sale",
        body: result.outcome === "no_bids" ? `${l.title} ended with no bids.` : `${l.title} didn't reach your reserve.`,
      });
    }
    const losers = new Set(rows.filter((b) => b.bidderId !== result.winningBid?.bidderId).map((b) => b.bidderId));
    for (const userId of losers) {
      await insertNotification(db, {
        campusId: l.campusId, userId, kind: "auction_lost", listingId: l.id, title: "Auction ended",
        body: result.winningBid ? `${l.title} went to another bidder at ${price}.` : `${l.title} closed without a sale.`,
      });
    }
    return true;
  }

  async function settleOne(id: string, now: Date) {
    try {
      return await tx(async (db) => {
        const l = await lockListing(db, id);
        return l ? settleLocked(db, l, now) : false;
      });
    } catch {
      return false;
    }
  }

  async function maintenance(now: Date) {
    const due = await http
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          eq(listings.saleMode, "auction"),
          isNull(listings.settledAt),
          eq(listings.status, "active"),
          lte(listings.auctionEndsAt, now),
        ),
      )
      .limit(50);
    let settledAuctions = 0;
    for (const { id } of due) if (await settleOne(id, now)) settledAuctions++;

    const expiredDibs = await tx(async (db) => {
      const expired = await db
        .update(dibs)
        .set({ status: "expired", updatedAt: now })
        .where(and(eq(dibs.status, "active"), lte(dibs.expiresAt, now)))
        .returning();
      for (const d of expired) {
        await db.update(handoffs).set({ status: "cancelled", updatedAt: now }).where(and(eq(handoffs.dibId, d.id), eq(handoffs.status, "pending")));
        const [l] = await db
          .update(listings)
          .set({ status: "active", updatedAt: now })
          .where(and(eq(listings.id, d.listingId), eq(listings.status, "reserved")))
          .returning({ title: listings.title });
        await insertNotification(db, {
          campusId: d.campusId, userId: d.buyerId, kind: "dibs_expired", listingId: d.listingId,
          title: "Your dibs expired", body: `${l?.title ?? "An item"} is back on the market.`,
        });
      }
      return expired.length;
    });
    return { expiredDibs, settledAuctions };
  }

  // Lazy maintenance on reads, throttled per instance. Cron is the primary path.
  let lastMaintenance = 0;
  async function maybeMaintain() {
    const t = Date.now();
    if (t - lastMaintenance < 20_000) return;
    lastMaintenance = t;
    await maintenance(new Date(t)).catch((e) => console.error("[dibs] maintenance failed", e));
  }

  return {
    kind: "neon",

    async getProfile(userId) {
      const [row] = await http.select().from(profiles).where(eq(profiles.id, userId));
      return (row as Profile | undefined) ?? null;
    },

    async upsertProfile(p) {
      const t = new Date();
      const [row] = await http
        .insert(profiles)
        .values({ ...p, createdAt: t, updatedAt: t })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { displayName: p.displayName, updatedAt: t, verifiedAt: sql`coalesce(${profiles.verifiedAt}, ${p.verifiedAt})` },
        })
        .returning();
      return row as Profile;
    },

    async listListings(f: ListingFilter) {
      await maybeMaintain();
      const conds: (SQL | undefined)[] = [
        inArray(listings.campusId, f.campusIds),
        inArray(listings.status, f.statuses ?? ["active", "reserved"]),
        f.sellerId ? eq(listings.sellerId, f.sellerId) : undefined,
        f.category ? eq(listings.category, f.category) : undefined,
        f.saleMode ? eq(listings.saleMode, f.saleMode) : undefined,
        f.freeOnly ? eq(listings.isFree, true) : undefined,
        f.pickupMode ? eq(listings.pickupMode, f.pickupMode) : undefined,
        f.pickupSpotId ? eq(listings.pickupSpotId, f.pickupSpotId) : undefined,
        f.minPriceCents !== undefined ? gte(listings.priceCents, f.minPriceCents) : undefined,
        f.maxPriceCents !== undefined ? lte(listings.priceCents, f.maxPriceCents) : undefined,
        f.q ? or(ilike(listings.title, `%${f.q}%`), ilike(listings.description, `%${f.q}%`)) : undefined,
      ];
      const order: Record<NonNullable<ListingFilter["sort"]>, SQL[]> = {
        newest: [desc(listings.createdAt)],
        price_asc: [sql`${listings.priceCents} asc`, desc(listings.createdAt)],
        price_desc: [desc(listings.priceCents), desc(listings.createdAt)],
        ending_soon: [sql`${listings.auctionEndsAt} asc nulls last`, desc(listings.createdAt)],
        popular: [sql`(${viewColumns.saveCount} + 2 * ${viewColumns.bidCount}) desc`, desc(listings.createdAt)],
      };
      return selectViews(http, and(...conds), order[f.sort ?? "newest"], f.limit ?? 200);
    },

    async getListing(id) {
      await maybeMaintain();
      return viewById(http, id);
    },

    async createListing(actor, input) {
      const now = new Date();
      const timing = validateAuctionTiming(input, now);
      if (timing) return fail("invalid", timing);
      const a = input.auction;
      const [row] = await http
        .insert(listings)
        .values({
          id: nid("lst"),
          campusId: actor.campusId,
          sellerId: actor.userId,
          title: input.title,
          description: input.description,
          category: input.category,
          condition: input.condition,
          saleMode: input.saleMode,
          priceCents: input.saleMode === "free" ? 0 : input.saleMode === "auction" ? a!.startingBidCents : input.priceCents,
          isFree: input.saleMode === "free",
          imageUrls: input.imageUrls,
          pickupMode: input.pickupMode,
          handoffStart: input.handoffStart,
          handoffEnd: input.handoffEnd,
          locationHint: input.locationHint,
          pickupSpotId: input.pickupSpotId,
          holdForMoveIn: input.holdForMoveIn,
          artSeed: input.artSeed ?? Math.floor(Math.random() * 360),
          ...(a
            ? {
                startingBidCents: a.startingBidCents,
                minimumIncrementCents: a.minimumIncrementCents,
                auctionStartsAt: a.auctionStartsAt,
                auctionEndsAt: a.auctionEndsAt,
                reservePriceCents: a.reservePriceCents,
                buyNowPriceCents: a.buyNowPriceCents,
              }
            : {}),
        })
        .returning();
      return ok(toListing(row));
    },

    async setListingStatus(actor, listingId, status) {
      return guarded(async (db) => {
        const l = await lockListing(db, listingId);
        if (!l || l.campusId !== actor.campusId) return fail("not_found", "Listing not found.");
        if (l.sellerId !== actor.userId) return fail("forbidden", "Only the seller can change this listing.");
        const now = new Date();
        if (status === "cancelled") {
          const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(bids).where(eq(bids.listingId, l.id));
          const check = checkAuctionCancel(l, Number(n));
          if (!check.ok) return check;
        } else if (status === "active") {
          if (l.saleMode === "auction") return fail("invalid", "Auctions can't be relisted — create a new one.");
          if (l.status !== "cancelled" && l.status !== "reserved") return fail("invalid", "Only cancelled or reserved items can be relisted.");
        } else if (status === "sold") {
          if (l.saleMode === "auction") return fail("invalid", "Auctions are marked sold by settlement.");
        } else {
          return fail("invalid", "Unsupported status change.");
        }
        if (status !== "sold") {
          await db.update(dibs).set({ status: "cancelled", updatedAt: now }).where(and(eq(dibs.listingId, l.id), eq(dibs.status, "active")));
          await db.update(handoffs).set({ status: "cancelled", updatedAt: now }).where(and(eq(handoffs.listingId, l.id), eq(handoffs.status, "pending")));
        }
        const [row] = await db.update(listings).set({ status, updatedAt: now }).where(eq(listings.id, l.id)).returning();
        return ok(toListing(row));
      });
    },

    async listBidsForListing(listingId) {
      const rows = await http.select().from(bids).where(eq(bids.listingId, listingId)).orderBy(desc(bids.amountCents));
      return rows.map((b) => ({ ...toBid(b), bidderLabel: bidderLabel(listingId, b.bidderId, null) }));
    },

    async listBidsForUser(actor) {
      await maybeMaintain();
      const rows = await http.select().from(bids).where(eq(bids.bidderId, actor.userId)).orderBy(desc(bids.createdAt)).limit(100);
      if (!rows.length) return [];
      const views = await selectViews(http, inArray(listings.id, [...new Set(rows.map((r) => r.listingId))]));
      const byId = new Map(views.map((v) => [v.id, v]));
      return rows.flatMap((b) => (byId.has(b.listingId) ? [{ ...toBid(b), listing: byId.get(b.listingId)! }] : []));
    },

    async placeBid(actor, input) {
      const res = await guarded(async (db) => {
        const now = new Date();
        const l = await lockListing(db, input.listingId);
        if (!l) return fail("not_found", "Listing not found.");
        if (await settleLocked(db, l, now)) return fail("auction_ended", "Bidding has closed.");
        const [dup] = await db
          .select()
          .from(bids)
          .where(and(eq(bids.bidderId, actor.userId), eq(bids.idempotencyKey, input.idempotencyKey)));
        if (dup) return ok({ bid: toBid(dup), listingId: l.id });
        const highest = await highestBid(db, l.id);
        const check = checkBid({ listing: l, actor, amountCents: input.amountCents, highest, now });
        if (!check.ok) {
          if (check.code === "bid_too_low" && input.expectedMinCents !== undefined && input.amountCents >= input.expectedMinCents) {
            return fail("conflict", `Another bid landed first. ${check.message}`);
          }
          return check;
        }
        const [bid] = await db
          .insert(bids)
          .values({
            id: nid("bid"),
            campusId: l.campusId,
            listingId: l.id,
            bidderId: actor.userId,
            amountCents: input.amountCents,
            status: "active",
            idempotencyKey: input.idempotencyKey,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        await db
          .update(bids)
          .set({ status: "outbid", updatedAt: now })
          .where(and(eq(bids.listingId, l.id), eq(bids.status, "active"), sql`${bids.id} <> ${bid.id}`));
        await db.update(listings).set({ priceCents: bid.amountCents, updatedAt: now }).where(eq(listings.id, l.id));
        if (highest && highest.bidderId !== actor.userId) {
          await insertNotification(db, {
            campusId: l.campusId, userId: highest.bidderId, kind: "outbid", listingId: l.id,
            title: "You've been outbid", body: `Someone bid ${formatCents(bid.amountCents)} on ${l.title}.`,
          });
        }
        await insertNotification(db, {
          campusId: l.campusId, userId: l.sellerId, kind: "bid_received", listingId: l.id,
          title: "New bid", body: `${l.title} is now at ${formatCents(bid.amountCents)}.`,
        });
        return ok({ bid: toBid(bid), listingId: l.id });
      });
      if (!res.ok) return res;
      const listing = await viewById(http, res.value.listingId);
      return ok({ bid: res.value.bid, listing: listing! });
    },

    async buyNow(actor, listingId) {
      const res = await guarded(async (db) => {
        const now = new Date();
        const l = await lockListing(db, listingId);
        if (!l) return fail("not_found", "Listing not found.");
        const highest = await highestBid(db, l.id);
        const check = checkBuyNow({ listing: l, actor, highest, now });
        if (!check.ok) return check;
        const prior = await db.select({ bidderId: bids.bidderId }).from(bids).where(eq(bids.listingId, l.id));
        await db.update(bids).set({ status: "outbid", updatedAt: now }).where(and(eq(bids.listingId, l.id), inArray(bids.status, ["active", "winning"])));
        const [bid] = await db
          .insert(bids)
          .values({
            id: nid("bid"), campusId: l.campusId, listingId: l.id, bidderId: actor.userId,
            amountCents: check.value.priceCents, status: "winning", idempotencyKey: `buynow:${l.id}`,
          })
          .returning();
        await db
          .update(listings)
          .set({ status: "sold", priceCents: bid.amountCents, settledAt: now, outcome: "bought_now", winningBidId: bid.id, updatedAt: now })
          .where(eq(listings.id, l.id));
        await insertHandoff(db, {
          campusId: l.campusId, listingId: l.id, sellerId: l.sellerId, buyerId: actor.userId,
          source: "auction", amountCents: bid.amountCents, dibId: null,
        });
        await insertNotification(db, {
          campusId: l.campusId, userId: actor.userId, kind: "auction_won", listingId: l.id,
          title: "Bought it! 🎉", body: `${l.title} is yours for ${formatCents(bid.amountCents)}.`,
        });
        await insertNotification(db, {
          campusId: l.campusId, userId: l.sellerId, kind: "auction_sold", listingId: l.id,
          title: "Bought now", body: `${l.title} sold instantly for ${formatCents(bid.amountCents)}.`,
        });
        for (const userId of new Set(prior.map((p) => p.bidderId).filter((u) => u !== actor.userId))) {
          await insertNotification(db, {
            campusId: l.campusId, userId, kind: "auction_lost", listingId: l.id,
            title: "Auction ended early", body: `Someone used buy-now on ${l.title}.`,
          });
        }
        return ok(l.id);
      });
      if (!res.ok) return res;
      return ok((await viewById(http, listingId))!);
    },

    async callDibs(actor, listingId) {
      const res = await guarded(async (db) => {
        const now = new Date();
        const l = await lockListing(db, listingId);
        if (!l) return fail("not_found", "Listing not found.");
        const [active] = await db.select().from(dibs).where(and(eq(dibs.listingId, l.id), eq(dibs.status, "active")));
        let current = active ? toDib(active) : null;
        if (current && current.expiresAt <= now) {
          await db.update(dibs).set({ status: "expired", updatedAt: now }).where(eq(dibs.id, current.id));
          if (l.status === "reserved") l.status = "active";
          current = null;
        }
        const check = checkClaim({ listing: l, actor, activeDib: current, now });
        if (!check.ok) return check;
        const [dib] = await db
          .insert(dibs)
          .values({ id: nid("dib"), campusId: l.campusId, listingId: l.id, buyerId: actor.userId, status: "active", expiresAt: dibsExpiry(l.campusId, now) })
          .returning();
        await db.update(listings).set({ status: "reserved", updatedAt: now }).where(eq(listings.id, l.id));
        await db.update(handoffs).set({ status: "cancelled", updatedAt: now }).where(and(eq(handoffs.listingId, l.id), eq(handoffs.status, "pending")));
        await insertHandoff(db, {
          campusId: l.campusId, listingId: l.id, sellerId: l.sellerId, buyerId: actor.userId,
          source: "dibs", amountCents: l.isFree ? 0 : l.priceCents, dibId: dib.id,
        });
        await insertNotification(db, {
          campusId: l.campusId, userId: actor.userId, kind: "dibs_confirmed", listingId: l.id,
          title: "Dibs locked in", body: `${l.title} is held for you until pickup.`,
        });
        await insertNotification(db, {
          campusId: l.campusId, userId: l.sellerId, kind: "dibs_received", listingId: l.id,
          title: "Someone called dibs!", body: `${l.title} is reserved. Arrange the handoff.`,
        });
        return ok(toDib(dib));
      });
      if (!res.ok) return res;
      return ok({ dib: res.value, listing: (await viewById(http, listingId))! });
    },

    async cancelDibs(actor, dibId) {
      return guarded(async (db) => {
        const [d] = await db.select().from(dibs).where(eq(dibs.id, dibId));
        if (!d || d.campusId !== actor.campusId) return fail("not_found", "Reservation not found.");
        const l = await lockListing(db, d.listingId);
        if (d.buyerId !== actor.userId && l?.sellerId !== actor.userId) return fail("forbidden", "Not your reservation.");
        if (d.status !== "active") return fail("unavailable", "This reservation is no longer active.");
        const now = new Date();
        const [row] = await db.update(dibs).set({ status: "cancelled", updatedAt: now }).where(eq(dibs.id, dibId)).returning();
        await db.update(handoffs).set({ status: "cancelled", updatedAt: now }).where(and(eq(handoffs.dibId, dibId), eq(handoffs.status, "pending")));
        await db.update(listings).set({ status: "active", updatedAt: now }).where(and(eq(listings.id, d.listingId), eq(listings.status, "reserved")));
        return ok(toDib(row));
      });
    },

    async completeDibs(actor, dibId) {
      return guarded(async (db) => {
        const [d] = await db.select().from(dibs).where(eq(dibs.id, dibId));
        if (!d || d.campusId !== actor.campusId) return fail("not_found", "Reservation not found.");
        const l = await lockListing(db, d.listingId);
        if (l?.sellerId !== actor.userId) return fail("forbidden", "Only the seller can confirm a handoff.");
        if (d.status !== "active") return fail("unavailable", "This reservation is no longer active.");
        const now = new Date();
        const [ho] = await db.select().from(handoffs).where(and(eq(handoffs.dibId, dibId), eq(handoffs.status, "pending")));
        if (ho) {
          const check = checkHandoffAck(toHandoff(ho), actor, "complete");
          if (!check.ok) return check;
          await db.update(handoffs).set({ status: "completed", completedAt: now, updatedAt: now }).where(eq(handoffs.id, ho.id));
        }
        const [row] = await db.update(dibs).set({ status: "completed", updatedAt: now }).where(eq(dibs.id, dibId)).returning();
        await db.update(listings).set({ status: "sold", updatedAt: now }).where(eq(listings.id, d.listingId));
        return ok(toDib(row));
      });
    },

    async listDibsForUser(actor) {
      await maybeMaintain();
      const rows = await http.select().from(dibs).where(eq(dibs.buyerId, actor.userId)).orderBy(desc(dibs.createdAt));
      if (!rows.length) return [];
      const views = await selectViews(http, inArray(listings.id, rows.map((r) => r.listingId)));
      const byId = new Map(views.map((v) => [v.id, v]));
      return rows.flatMap((d) => (byId.has(d.listingId) ? [{ ...toDib(d), listing: byId.get(d.listingId)! }] : []));
    },

    async listDibsForSeller(actor) {
      await maybeMaintain();
      const rows = await http
        .select({ dib: dibs, buyerName: profiles.displayName })
        .from(dibs)
        .innerJoin(listings, eq(listings.id, dibs.listingId))
        .leftJoin(profiles, eq(profiles.id, dibs.buyerId))
        .where(and(eq(listings.sellerId, actor.userId), eq(dibs.status, "active")));
      if (!rows.length) return [];
      const views = await selectViews(http, inArray(listings.id, rows.map((r) => r.dib.listingId)));
      const byId = new Map(views.map((v) => [v.id, v]));
      return rows.map((r) => ({ ...toDib(r.dib), listing: byId.get(r.dib.listingId)!, buyerName: r.buyerName ?? "Student" }));
    },

    async getActiveDibForListing(listingId) {
      const [row] = await http.select().from(dibs).where(and(eq(dibs.listingId, listingId), eq(dibs.status, "active")));
      return row ? toDib(row) : null;
    },

    async listHandoffs(actor) {
      await maybeMaintain();
      const rows = await http
        .select()
        .from(handoffs)
        .where(
          and(
            eq(handoffs.campusId, actor.campusId),
            or(eq(handoffs.buyerId, actor.userId), eq(handoffs.sellerId, actor.userId)),
            sql`${handoffs.status} <> 'cancelled'`,
          ),
        )
        .orderBy(sql`${handoffs.scheduledAt} asc nulls last`, desc(handoffs.createdAt));
      if (!rows.length) return [];
      const [ls, ps] = await Promise.all([
        http.select().from(listings).where(inArray(listings.id, rows.map((r) => r.listingId))),
        http.select({ id: profiles.id, name: profiles.displayName }).from(profiles)
          .where(inArray(profiles.id, [...new Set(rows.flatMap((r) => [r.buyerId, r.sellerId]))])),
      ]);
      const lById = new Map(ls.map((l) => [l.id, l]));
      const name = (uid: string) => ps.find((p) => p.id === uid)?.name ?? "Student";
      return rows.map((h): HandoffView => {
        const l = lById.get(h.listingId);
        return {
          ...toHandoff(h),
          listingTitle: l?.title ?? "Item",
          listingImage: l?.imageUrls[0] ?? null,
          listingCategory: l?.category ?? "other",
          listingArtSeed: l?.artSeed ?? 0,
          pickupSpotId: l?.pickupSpotId ?? null,
          holdForMoveIn: l?.holdForMoveIn ?? false,
          sellerName: name(h.sellerId),
          buyerName: name(h.buyerId),
          role: h.buyerId === actor.userId ? "buyer" : "seller",
        };
      });
    },

    async getOpenHandoffForListing(listingId) {
      const [row] = await http.select().from(handoffs).where(and(eq(handoffs.listingId, listingId), eq(handoffs.status, "pending")));
      return row ? toHandoff(row) : null;
    },

    async scheduleHandoff(actor, handoffId, phase, at) {
      return guarded(async (db) => {
        const [row] = await db.select().from(handoffs).where(eq(handoffs.id, handoffId)).for("update");
        if (!row) return fail("not_found", "Handoff not found.");
        const h = toHandoff(row);
        const check = checkHandoffAck(h, actor, "schedule");
        if (!check.ok) return check;
        const [l] = await db.select().from(listings).where(eq(listings.id, h.listingId));
        const campus = getCampus(h.campusId)!;
        const now = new Date();
        const when = checkSchedule({ phase, at, now, moveInDate: campus.moveInDate, holdForMoveIn: !!l?.holdForMoveIn });
        if (!when.ok) return when;
        const [updated] = await db.update(handoffs).set({ phase, scheduledAt: at, updatedAt: now }).where(eq(handoffs.id, h.id)).returning();
        if (h.dibId) {
          await db
            .update(dibs)
            .set({ expiresAt: sql`greatest(${dibs.expiresAt}, ${new Date(at.getTime() + 6 * 3_600_000)})`, updatedAt: now })
            .where(and(eq(dibs.id, h.dibId), eq(dibs.status, "active")));
        }
        await insertNotification(db, {
          campusId: h.campusId, userId: actor.userId === h.buyerId ? h.sellerId : h.buyerId, kind: "dibs_confirmed", listingId: h.listingId,
          title: phase === "move_in" ? "Move-in pickup scheduled" : "Pickup scheduled",
          body: `${l?.title ?? "Item"}: ${at.toLocaleString("en-US", { timeZone: campus.timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
        });
        return ok(toHandoff(updated));
      });
    },

    async ackHandoff(actor, handoffId, what, method) {
      return guarded(async (db) => {
        const [row] = await db.select().from(handoffs).where(eq(handoffs.id, handoffId)).for("update");
        if (!row) return fail("not_found", "Handoff not found.");
        const h = toHandoff(row);
        const check = checkHandoffAck(h, actor, what);
        if (!check.ok) return check;
        const now = new Date();
        const patch =
          what === "sent"
            ? { paymentSentAt: now, paymentMethod: method ?? h.paymentMethod, updatedAt: now }
            : { paymentReceivedAt: now, paymentMethod: h.paymentMethod ?? method, updatedAt: now };
        const [updated] = await db.update(handoffs).set(patch).where(eq(handoffs.id, h.id)).returning();
        const [l] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, h.listingId));
        await insertNotification(db, {
          campusId: h.campusId, userId: what === "sent" ? h.sellerId : h.buyerId, kind: "dibs_confirmed", listingId: h.listingId,
          title: what === "sent" ? "Payment sent" : "Payment received",
          body: `${formatCents(h.amountCents)} for ${l?.title ?? "an item"}${updated.paymentMethod ? ` via ${updated.paymentMethod}` : ""}.`,
        });
        return ok(toHandoff(updated));
      });
    },

    async completeHandoff(actor, handoffId) {
      return guarded(async (db) => {
        const [row] = await db.select().from(handoffs).where(eq(handoffs.id, handoffId)).for("update");
        if (!row) return fail("not_found", "Handoff not found.");
        const h = toHandoff(row);
        const check = checkHandoffAck(h, actor, "complete");
        if (!check.ok) return check;
        const now = new Date();
        const [updated] = await db.update(handoffs).set({ status: "completed", completedAt: now, updatedAt: now }).where(eq(handoffs.id, h.id)).returning();
        if (h.dibId) await db.update(dibs).set({ status: "completed", updatedAt: now }).where(and(eq(dibs.id, h.dibId), eq(dibs.status, "active")));
        const [l] = await db.update(listings).set({ status: "sold", updatedAt: now }).where(eq(listings.id, h.listingId)).returning({ title: listings.title });
        await insertNotification(db, {
          campusId: h.campusId, userId: h.buyerId, kind: "dibs_confirmed", listingId: h.listingId,
          title: "Handoff complete", body: `${l?.title ?? "Item"} is officially yours. Enjoy!`,
        });
        return ok(toHandoff(updated));
      });
    },

    async toggleSave(actor, listingId) {
      const [l] = await http.select({ campusId: listings.campusId }).from(listings).where(eq(listings.id, listingId));
      if (!l) return fail("not_found", "Listing not found.");
      if (!canTransact(actor, l.campusId) && !canViewCampus(actor.campusId, l.campusId, actor.campusId)) {
        return fail("forbidden", "Not visible to you.");
      }
      const removed = await http
        .delete(saves)
        .where(and(eq(saves.userId, actor.userId), eq(saves.listingId, listingId)))
        .returning({ id: saves.id });
      if (removed.length) return ok({ saved: false });
      await http
        .insert(saves)
        .values({ id: nid("sav"), campusId: l.campusId, listingId, userId: actor.userId })
        .onConflictDoNothing();
      return ok({ saved: true });
    },

    async listSavedIds(actor) {
      const rows = await http.select({ id: saves.listingId }).from(saves).where(eq(saves.userId, actor.userId));
      return rows.map((r) => r.id);
    },

    async listSaves(actor) {
      const rows = await http.select().from(saves).where(eq(saves.userId, actor.userId)).orderBy(desc(saves.createdAt));
      if (!rows.length) return [];
      const views = await selectViews(http, inArray(listings.id, rows.map((r) => r.listingId)));
      const byId = new Map(views.map((v) => [v.id, v]));
      return rows.flatMap((s) => (byId.has(s.listingId) ? [{ ...s, listing: byId.get(s.listingId)! }] : []));
    },

    async listNotifications(actor, limit = 50) {
      await maybeMaintain();
      const rows = await http
        .select()
        .from(notifications)
        .where(eq(notifications.userId, actor.userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return rows as Notification[];
    },

    async unreadCount(actor) {
      const [{ n }] = await http
        .select({ n: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, actor.userId), isNull(notifications.readAt)));
      return Number(n);
    },

    async markNotificationsRead(actor) {
      await http
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.userId, actor.userId), isNull(notifications.readAt)));
    },

    async campusStats(campusId) {
      await maybeMaintain();
      const res = await http.execute(sql`
        select
          (select count(*)::int from listings where campus_id = ${campusId} and status in ('active','reserved')) as active_listings,
          (select count(*)::int from listings where campus_id = ${campusId} and status in ('active','reserved') and is_free) as free_items,
          (select count(*)::int from listings where campus_id = ${campusId} and status = 'active' and sale_mode = 'auction') as live_auctions,
          (select count(*)::int from dibs where campus_id = ${campusId}) as dibs_called,
          (select count(*)::int from bids where campus_id = ${campusId}) as bids_placed,
          (select coalesce(sum(l.price_cents), 0)::int from dibs d join listings l on l.id = d.listing_id
             where d.campus_id = ${campusId} and d.status <> 'cancelled') as saved_cents
      `);
      const row = (res as unknown as { rows: Record<string, unknown>[] }).rows[0];
      return {
        activeListings: Number(row.active_listings),
        freeItems: Number(row.free_items),
        liveAuctions: Number(row.live_auctions),
        dibsCalled: Number(row.dibs_called),
        bidsPlaced: Number(row.bids_placed),
        savedCents: Number(row.saved_cents),
      };
    },

    async runMaintenance(at) {
      return maintenance(at ?? new Date());
    },

    async demoEndAuction(listingId) {
      const now = new Date();
      const rows = await http
        .update(listings)
        .set({ auctionEndsAt: new Date(now.getTime() - 1000), updatedAt: now })
        .where(and(eq(listings.id, listingId), eq(listings.saleMode, "auction"), isNull(listings.settledAt), eq(listings.status, "active")))
        .returning({ id: listings.id });
      if (!rows.length) return fail("not_found", "No open auction with that id.");
      await settleOne(listingId, now);
      return ok(undefined);
    },

    async settleAuction(listingId, at) {
      await settleOne(listingId, at ?? new Date());
      const v = await viewById(http, listingId);
      return v ? ok(v) : fail("not_found", "Auction not found.");
    },
  } satisfies MarketRepository;
}
