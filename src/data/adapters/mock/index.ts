/**
 * In-memory adapter. Deterministic (seeded relative to boot time), resettable,
 * and shared across requests via `globalThis` in a single server process.
 *
 * Concurrency: every mutation runs its read-check-write synchronously (no
 * `await` inside the critical section), so on Node's single thread two
 * concurrent bids/dibs can never interleave and corrupt state.
 */
import { randomUUID } from "node:crypto";
import {
  auctionPhase,
  bidderLabel,
  checkAuctionCancel,
  checkBid,
  checkBuyNow,
  computeSettlement,
  statusesAfterNewHigh,
} from "@/features/auctions/domain";
import { checkClaim, dibsExpiry, isExpired } from "@/features/dibs/domain";
import { validateAuctionTiming, type NewListingInput } from "@/features/listings/schema";
import { canTransact, canViewCampus } from "@/lib/policy";
import { formatCents } from "@/lib/money";
import { buildSeed, type SeedData } from "../../seed";
import { fail, ok, type Actor, type MarketRepository, type PlaceBidInput, type Result } from "../../repository";
import type { Bid, Dib, Listing, ListingFilter, ListingStatus, ListingView, Notification, NotificationKind } from "../../types";

type Store = SeedData & { bootedAt: Date };

const g = globalThis as unknown as { __dibsMockStore?: Store };

function store(): Store {
  if (!g.__dibsMockStore) g.__dibsMockStore = { ...buildSeed(new Date()), bootedAt: new Date() };
  return g.__dibsMockStore;
}

export function resetMockStore(now = new Date()) {
  g.__dibsMockStore = { ...buildSeed(now), bootedAt: now };
}

const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

function highestBid(s: Store, listingId: string): Bid | null {
  let top: Bid | null = null;
  for (const b of s.bids) {
    if (b.listingId !== listingId) continue;
    if (b.status === "withdrawn" || b.status === "rejected") continue;
    if (!top || b.amountCents > top.amountCents) top = b;
  }
  return top;
}

function view(s: Store, l: Listing): ListingView {
  const seller = s.profiles.find((p) => p.id === l.sellerId);
  const listingBids = s.bids.filter((b) => b.listingId === l.id && b.status !== "rejected" && b.status !== "withdrawn");
  const top = highestBid(s, l.id);
  return {
    ...l,
    seller: {
      id: l.sellerId,
      displayName: seller?.displayName ?? "Student",
      avatarUrl: seller?.avatarUrl ?? null,
      verifiedAt: seller?.verifiedAt ?? null,
    },
    bidCount: listingBids.length,
    highestBidCents: top?.amountCents ?? null,
    saveCount: s.saves.filter((x) => x.listingId === l.id).length,
  };
}

function notify(
  s: Store,
  n: { campusId: string; userId: string; kind: NotificationKind; title: string; body: string; listingId: string | null },
  now: Date,
) {
  const row: Notification = { id: id("ntf"), readAt: null, createdAt: now, ...n };
  s.notifications.push(row);
}

function activeDib(s: Store, listingId: string): Dib | null {
  return s.dibs.find((d) => d.listingId === listingId && d.status === "active") ?? null;
}

/** Synchronous; mutates the store. Returns true if a settlement happened. */
function settleSync(s: Store, l: Listing, now: Date): boolean {
  if (l.saleMode !== "auction" || !l.auction || l.auction.settledAt) return false;
  if (l.status === "cancelled") return false;
  if (auctionPhase(l, now) !== "ended") return false;
  const bids = s.bids.filter((b) => b.listingId === l.id);
  const result = computeSettlement(l, bids);
  for (const b of bids) {
    const st = result.bidStatuses.get(b.id);
    if (st) {
      b.status = st;
      b.updatedAt = now;
    }
  }
  l.status = result.listingStatus;
  l.auction = { ...l.auction, settledAt: now, outcome: result.outcome, winningBidId: result.winningBid?.id ?? null };
  l.updatedAt = now;
  const price = result.winningBid ? formatCents(result.winningBid.amountCents) : null;
  if (result.winningBid) {
    notify(s, {
      campusId: l.campusId, userId: result.winningBid.bidderId, kind: "auction_won", listingId: l.id,
      title: "You won! 🎉", body: `${l.title} is yours for ${price}. Message the seller to set up pickup.`,
    }, now);
    notify(s, {
      campusId: l.campusId, userId: l.sellerId, kind: "auction_sold", listingId: l.id,
      title: "Auction sold", body: `${l.title} sold for ${price}.`,
    }, now);
  } else {
    notify(s, {
      campusId: l.campusId, userId: l.sellerId, kind: "auction_unsold", listingId: l.id,
      title: "Auction closed without a sale",
      body: result.outcome === "no_bids" ? `${l.title} ended with no bids.` : `${l.title} didn't reach your reserve.`,
    }, now);
  }
  const losers = new Set(bids.filter((b) => b.bidderId !== result.winningBid?.bidderId).map((b) => b.bidderId));
  for (const userId of losers) {
    notify(s, {
      campusId: l.campusId, userId, kind: "auction_lost", listingId: l.id,
      title: "Auction ended",
      body: result.winningBid ? `${l.title} went to another bidder at ${price}.` : `${l.title} closed without a sale.`,
    }, now);
  }
  return true;
}

function maintenanceSync(s: Store, now: Date) {
  let expiredDibs = 0;
  let settledAuctions = 0;
  for (const d of s.dibs) {
    if (!isExpired(d, now)) continue;
    d.status = "expired";
    d.updatedAt = now;
    const l = s.listings.find((x) => x.id === d.listingId);
    if (l && l.status === "reserved") {
      l.status = "active";
      l.updatedAt = now;
    }
    notify(s, {
      campusId: d.campusId, userId: d.buyerId, kind: "dibs_expired", listingId: d.listingId,
      title: "Your dibs expired", body: `${l?.title ?? "An item"} is back on the market.`,
    }, now);
    expiredDibs++;
  }
  for (const l of s.listings) if (settleSync(s, l, now)) settledAuctions++;
  return { expiredDibs, settledAuctions };
}

function matches(l: ListingView, f: ListingFilter) {
  if (!f.campusIds.includes(l.campusId)) return false;
  const statuses = f.statuses ?? ["active", "reserved"];
  if (!statuses.includes(l.status)) return false;
  if (f.sellerId && l.sellerId !== f.sellerId) return false;
  if (f.category && l.category !== f.category) return false;
  if (f.saleMode && l.saleMode !== f.saleMode) return false;
  if (f.freeOnly && !l.isFree) return false;
  if (f.pickupMode && l.pickupMode !== f.pickupMode) return false;
  if (f.pickupSpotId && l.pickupSpotId !== f.pickupSpotId) return false;
  const price = l.saleMode === "auction" ? (l.highestBidCents ?? l.auction!.startingBidCents) : l.priceCents;
  if (f.minPriceCents !== undefined && price < f.minPriceCents) return false;
  if (f.maxPriceCents !== undefined && price > f.maxPriceCents) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    if (!`${l.title} ${l.description} ${l.category}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

export function effectivePrice(l: ListingView) {
  return l.saleMode === "auction" ? (l.highestBidCents ?? l.auction!.startingBidCents) : l.priceCents;
}

export function sortListings(rows: ListingView[], sort: ListingFilter["sort"] = "newest") {
  const byNew = (a: ListingView, b: ListingView) => b.createdAt.getTime() - a.createdAt.getTime();
  const cmp: Record<NonNullable<ListingFilter["sort"]>, (a: ListingView, b: ListingView) => number> = {
    newest: byNew,
    price_asc: (a, b) => effectivePrice(a) - effectivePrice(b) || byNew(a, b),
    price_desc: (a, b) => effectivePrice(b) - effectivePrice(a) || byNew(a, b),
    ending_soon: (a, b) => {
      const ea = a.auction?.auctionEndsAt.getTime() ?? Number.MAX_SAFE_INTEGER;
      const eb = b.auction?.auctionEndsAt.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ea - eb || byNew(a, b);
    },
    popular: (a, b) => b.saveCount + b.bidCount * 2 - (a.saveCount + a.bidCount * 2) || byNew(a, b),
  };
  return rows.sort(cmp[sort]);
}

const clone = <T>(v: T): T => structuredClone(v);

export function createMockRepository(): MarketRepository {
  const now = () => new Date();
  const maintain = () => maintenanceSync(store(), now());

  return {
    kind: "mock",

    async getProfile(userId) {
      return clone(store().profiles.find((p) => p.id === userId) ?? null);
    },

    async upsertProfile(p) {
      const s = store();
      const existing = s.profiles.find((x) => x.id === p.id);
      const t = now();
      if (existing) {
        Object.assign(existing, { ...p, verifiedAt: existing.verifiedAt ?? p.verifiedAt, updatedAt: t });
        return clone(existing);
      }
      const row = { ...p, avatarUrl: null, createdAt: t, updatedAt: t };
      s.profiles.push(row);
      return clone(row);
    },

    async listListings(filter) {
      maintain();
      const s = store();
      const rows = s.listings.map((l) => view(s, l)).filter((l) => matches(l, filter));
      return clone(sortListings(rows, filter.sort).slice(0, filter.limit ?? 200));
    },

    async getListing(listingId) {
      maintain();
      const s = store();
      const l = s.listings.find((x) => x.id === listingId);
      return l ? clone(view(s, l)) : null;
    },

    async createListing(actor, input: NewListingInput) {
      const t = now();
      const timing = validateAuctionTiming(input, t);
      if (timing) return fail("invalid", timing);
      const s = store();
      const a = input.auction;
      const listing: Listing = {
        id: id("lst"),
        campusId: actor.campusId,
        sellerId: actor.userId,
        title: input.title,
        description: input.description,
        category: input.category,
        condition: input.condition,
        saleMode: input.saleMode,
        priceCents: input.saleMode === "free" ? 0 : input.saleMode === "auction" ? a!.startingBidCents : input.priceCents,
        isFree: input.saleMode === "free",
        currency: "USD",
        imageUrls: input.imageUrls,
        status: "active",
        pickupMode: input.pickupMode,
        handoffStart: input.handoffStart,
        handoffEnd: input.handoffEnd,
        locationHint: input.locationHint,
        pickupSpotId: input.pickupSpotId,
        artSeed: input.artSeed ?? Math.floor(Math.random() * 360),
        auction:
          input.saleMode === "auction" && a
            ? { ...a, settledAt: null, outcome: null, winningBidId: null }
            : null,
        createdAt: t,
        updatedAt: t,
      };
      s.listings.push(listing);
      return ok(clone(listing));
    },

    async setListingStatus(actor, listingId, status: ListingStatus) {
      const s = store();
      const l = s.listings.find((x) => x.id === listingId);
      if (!l || l.campusId !== actor.campusId) return fail("not_found", "Listing not found.");
      if (l.sellerId !== actor.userId) return fail("forbidden", "Only the seller can change this listing.");
      if (status === "cancelled") {
        const bidCount = s.bids.filter((b) => b.listingId === l.id).length;
        const check = checkAuctionCancel(l, bidCount);
        if (!check.ok) return check;
        const d = activeDib(s, l.id);
        if (d) {
          d.status = "cancelled";
          d.updatedAt = now();
        }
      } else if (status === "active") {
        if (l.status !== "cancelled" && l.status !== "reserved") return fail("invalid", "Only cancelled or reserved items can be relisted.");
        if (l.saleMode === "auction") return fail("invalid", "Auctions can't be relisted — create a new one.");
        const d = activeDib(s, l.id);
        if (d) {
          d.status = "cancelled";
          d.updatedAt = now();
        }
      } else if (status === "sold") {
        if (l.saleMode === "auction") return fail("invalid", "Auctions are marked sold by settlement.");
      } else {
        return fail("invalid", "Unsupported status change.");
      }
      l.status = status;
      l.updatedAt = now();
      return ok(clone(l));
    },

    async listBidsForListing(listingId) {
      const s = store();
      return clone(
        s.bids
          .filter((b) => b.listingId === listingId)
          .sort((a, b) => b.amountCents - a.amountCents)
          .map((b) => ({ ...b, bidderLabel: bidderLabel(listingId, b.bidderId, null) })),
      );
    },

    async listBidsForUser(actor) {
      maintain();
      const s = store();
      return clone(
        s.bids
          .filter((b) => b.bidderId === actor.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .flatMap((b) => {
            const l = s.listings.find((x) => x.id === b.listingId);
            return l ? [{ ...b, listing: view(s, l) }] : [];
          }),
      );
    },

    async placeBid(actor, input: PlaceBidInput) {
      // ——— critical section: no awaits below ———
      const s = store();
      const t = now();
      maintenanceSync(s, t);
      const l = s.listings.find((x) => x.id === input.listingId);
      if (!l) return fail("not_found", "Listing not found.");
      const dup = s.bids.find((b) => b.bidderId === actor.userId && b.idempotencyKey === input.idempotencyKey);
      if (dup) return ok(clone({ bid: dup, listing: view(s, l) }));
      const highest = highestBid(s, l.id);
      const check = checkBid({ listing: l, actor, amountCents: input.amountCents, highest, now: t });
      if (!check.ok) {
        // Distinguish "someone beat you" from a plain low bid for the UI.
        if (check.code === "bid_too_low" && input.expectedMinCents !== undefined && input.amountCents >= input.expectedMinCents) {
          return fail("conflict", `Another bid landed first. ${check.message}`);
        }
        return check;
      }
      const bid: Bid = {
        id: id("bid"),
        campusId: l.campusId,
        listingId: l.id,
        bidderId: actor.userId,
        amountCents: input.amountCents,
        status: "active",
        idempotencyKey: input.idempotencyKey,
        createdAt: t,
        updatedAt: t,
      };
      s.bids.push(bid);
      const listingBids = s.bids.filter((b) => b.listingId === l.id);
      for (const [bidId, st] of statusesAfterNewHigh(listingBids, bid.id)) {
        const b = listingBids.find((x) => x.id === bidId)!;
        b.status = st;
        b.updatedAt = t;
      }
      l.priceCents = bid.amountCents;
      l.updatedAt = t;
      if (highest && highest.bidderId !== actor.userId) {
        notify(s, {
          campusId: l.campusId, userId: highest.bidderId, kind: "outbid", listingId: l.id,
          title: "You've been outbid", body: `Someone bid ${formatCents(bid.amountCents)} on ${l.title}.`,
        }, t);
      }
      notify(s, {
        campusId: l.campusId, userId: l.sellerId, kind: "bid_received", listingId: l.id,
        title: "New bid", body: `${l.title} is now at ${formatCents(bid.amountCents)}.`,
      }, t);
      return ok(clone({ bid, listing: view(s, l) }));
    },

    async buyNow(actor, listingId) {
      const s = store();
      const t = now();
      maintenanceSync(s, t);
      const l = s.listings.find((x) => x.id === listingId);
      if (!l) return fail("not_found", "Listing not found.");
      const highest = highestBid(s, l.id);
      const check = checkBuyNow({ listing: l, actor, highest, now: t });
      if (!check.ok) return check;
      const bid: Bid = {
        id: id("bid"), campusId: l.campusId, listingId: l.id, bidderId: actor.userId,
        amountCents: check.value.priceCents, status: "winning", idempotencyKey: `buynow:${l.id}`,
        createdAt: t, updatedAt: t,
      };
      const losers = new Set<string>();
      for (const b of s.bids) {
        if (b.listingId !== l.id) continue;
        if (b.status === "active" || b.status === "winning") b.status = "outbid";
        b.updatedAt = t;
        if (b.bidderId !== actor.userId) losers.add(b.bidderId);
      }
      s.bids.push(bid);
      l.status = "sold";
      l.priceCents = bid.amountCents;
      l.auction = { ...l.auction!, settledAt: t, outcome: "bought_now", winningBidId: bid.id };
      l.updatedAt = t;
      notify(s, {
        campusId: l.campusId, userId: actor.userId, kind: "auction_won", listingId: l.id,
        title: "Bought it! 🎉", body: `${l.title} is yours for ${formatCents(bid.amountCents)}.`,
      }, t);
      notify(s, {
        campusId: l.campusId, userId: l.sellerId, kind: "auction_sold", listingId: l.id,
        title: "Bought now", body: `${l.title} sold instantly for ${formatCents(bid.amountCents)}.`,
      }, t);
      for (const userId of losers) {
        notify(s, {
          campusId: l.campusId, userId, kind: "auction_lost", listingId: l.id,
          title: "Auction ended early", body: `Someone used buy-now on ${l.title}.`,
        }, t);
      }
      return ok(clone(view(s, l)));
    },

    async callDibs(actor, listingId) {
      const s = store();
      const t = now();
      maintenanceSync(s, t);
      const l = s.listings.find((x) => x.id === listingId);
      if (!l) return fail("not_found", "Listing not found.");
      const check = checkClaim({ listing: l, actor, activeDib: activeDib(s, l.id), now: t });
      if (!check.ok) return check;
      const dib: Dib = {
        id: id("dib"), campusId: l.campusId, listingId: l.id, buyerId: actor.userId,
        status: "active", expiresAt: dibsExpiry(l.campusId, t), createdAt: t, updatedAt: t,
      };
      s.dibs.push(dib);
      l.status = "reserved";
      l.updatedAt = t;
      notify(s, {
        campusId: l.campusId, userId: actor.userId, kind: "dibs_confirmed", listingId: l.id,
        title: "Dibs locked in", body: `${l.title} is held for you until pickup.`,
      }, t);
      notify(s, {
        campusId: l.campusId, userId: l.sellerId, kind: "dibs_received", listingId: l.id,
        title: "Someone called dibs!", body: `${l.title} is reserved. Arrange the handoff.`,
      }, t);
      return ok(clone({ dib, listing: view(s, l) }));
    },

    async cancelDibs(actor, dibId) {
      const s = store();
      const d = s.dibs.find((x) => x.id === dibId);
      if (!d || d.campusId !== actor.campusId) return fail("not_found", "Reservation not found.");
      const l = s.listings.find((x) => x.id === d.listingId);
      if (d.buyerId !== actor.userId && l?.sellerId !== actor.userId) return fail("forbidden", "Not your reservation.");
      if (d.status !== "active") return fail("unavailable", "This reservation is no longer active.");
      d.status = "cancelled";
      d.updatedAt = now();
      if (l && l.status === "reserved") l.status = "active";
      return ok(clone(d));
    },

    async completeDibs(actor, dibId) {
      const s = store();
      const d = s.dibs.find((x) => x.id === dibId);
      if (!d || d.campusId !== actor.campusId) return fail("not_found", "Reservation not found.");
      const l = s.listings.find((x) => x.id === d.listingId);
      if (l?.sellerId !== actor.userId) return fail("forbidden", "Only the seller can confirm a handoff.");
      if (d.status !== "active") return fail("unavailable", "This reservation is no longer active.");
      d.status = "completed";
      d.updatedAt = now();
      if (l) l.status = "sold";
      return ok(clone(d));
    },

    async listDibsForUser(actor) {
      maintain();
      const s = store();
      return clone(
        s.dibs
          .filter((d) => d.buyerId === actor.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .flatMap((d) => {
            const l = s.listings.find((x) => x.id === d.listingId);
            return l ? [{ ...d, listing: view(s, l) }] : [];
          }),
      );
    },

    async listDibsForSeller(actor) {
      maintain();
      const s = store();
      return clone(
        s.dibs
          .filter((d) => d.status === "active")
          .flatMap((d) => {
            const l = s.listings.find((x) => x.id === d.listingId);
            if (!l || l.sellerId !== actor.userId) return [];
            const buyer = s.profiles.find((p) => p.id === d.buyerId);
            return [{ ...d, listing: view(s, l), buyerName: buyer?.displayName ?? "Student" }];
          }),
      );
    },

    async getActiveDibForListing(listingId) {
      maintain();
      return clone(activeDib(store(), listingId));
    },

    async toggleSave(actor, listingId) {
      const s = store();
      const l = s.listings.find((x) => x.id === listingId);
      if (!l) return fail("not_found", "Listing not found.");
      // Saving is allowed for anything the actor may see; transacting is checked elsewhere.
      if (!canTransact(actor, l.campusId) && !canViewCampus(actor.campusId, l.campusId, actor.campusId)) {
        return fail("forbidden", "Not visible to you.");
      }
      const idx = s.saves.findIndex((x) => x.listingId === listingId && x.userId === actor.userId);
      if (idx >= 0) {
        s.saves.splice(idx, 1);
        return ok({ saved: false });
      }
      s.saves.push({ id: id("sav"), campusId: l.campusId, listingId, userId: actor.userId, createdAt: now() });
      return ok({ saved: true });
    },

    async listSavedIds(actor) {
      return store().saves.filter((x) => x.userId === actor.userId).map((x) => x.listingId);
    },

    async listSaves(actor) {
      const s = store();
      return clone(
        s.saves
          .filter((x) => x.userId === actor.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .flatMap((x) => {
            const l = s.listings.find((y) => y.id === x.listingId);
            return l ? [{ ...x, listing: view(s, l) }] : [];
          }),
      );
    },

    async listNotifications(actor, limit = 50) {
      maintain();
      return clone(
        store()
          .notifications.filter((n) => n.userId === actor.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit),
      );
    },

    async unreadCount(actor) {
      maintain();
      return store().notifications.filter((n) => n.userId === actor.userId && !n.readAt).length;
    },

    async markNotificationsRead(actor) {
      const t = now();
      for (const n of store().notifications) if (n.userId === actor.userId && !n.readAt) n.readAt = t;
    },

    async campusStats(campusId) {
      maintain();
      const s = store();
      const mine = s.listings.filter((l) => l.campusId === campusId);
      const open = mine.filter((l) => l.status === "active" || l.status === "reserved");
      const savedCents = s.dibs
        .filter((d) => d.campusId === campusId && d.status !== "cancelled")
        .reduce((sum, d) => sum + (mine.find((l) => l.id === d.listingId)?.priceCents ?? 0), 0);
      return {
        activeListings: open.length,
        freeItems: open.filter((l) => l.isFree).length,
        liveAuctions: open.filter((l) => l.saleMode === "auction" && l.status === "active").length,
        dibsCalled: s.dibs.filter((d) => d.campusId === campusId).length,
        bidsPlaced: s.bids.filter((b) => b.campusId === campusId).length,
        savedCents,
      };
    },

    async runMaintenance(at) {
      return maintenanceSync(store(), at ?? now());
    },

    async settleAuction(listingId, at) {
      const s = store();
      const l = s.listings.find((x) => x.id === listingId);
      if (!l || l.saleMode !== "auction") return fail("not_found", "Auction not found.");
      settleSync(s, l, at ?? now());
      return ok(clone(view(s, l)));
    },
  } satisfies MarketRepository;
}

/** Demo-only: force an auction's deadline into the past so settlement can be shown. */
export function mockEndAuctionNow(listingId: string): Result<void> {
  const s = store();
  const l = s.listings.find((x) => x.id === listingId);
  if (!l?.auction || l.auction.settledAt) return fail("not_found", "No open auction with that id.");
  const t = new Date();
  l.auction = { ...l.auction, auctionEndsAt: new Date(t.getTime() - 1000) };
  settleSync(s, l, t);
  return ok(undefined);
}

export type { Actor };
