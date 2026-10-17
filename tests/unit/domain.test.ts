import { describe, expect, it } from "vitest";
import { checkBid, computeSettlement, minNextBidCents } from "@/features/auctions/domain";
import { newListingSchema } from "@/features/listings/schema";
import type { Bid, Listing } from "@/data/types";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { canTransact, canViewCampus, visibleCampusIds } from "@/lib/policy";

const now = new Date("2026-10-17T12:00:00Z");
const auction = (over: Partial<Listing["auction"]> = {}): Listing => ({
  id: "l1", campusId: "ua", sellerId: "seller", title: "Fridge", description: "", category: "fridge", condition: "good",
  saleMode: "auction", priceCents: 4000, isFree: false, currency: "USD", imageUrls: [], status: "active",
  pickupMode: "now", handoffStart: null, handoffEnd: null, locationHint: null, pickupSpotId: null, holdForMoveIn: false, artSeed: 1,
  auction: {
    startingBidCents: 4000, minimumIncrementCents: 500, auctionStartsAt: new Date(now.getTime() - 3600e3),
    auctionEndsAt: new Date(now.getTime() + 3600e3 * 5), reservePriceCents: null, buyNowPriceCents: 15000,
    settledAt: null, outcome: null, winningBidId: null, ...over,
  },
  createdAt: now, updatedAt: now,
});
const bid = (id: string, bidderId: string, amountCents: number, status: Bid["status"] = "outbid"): Bid => ({
  id, campusId: "ua", listingId: "l1", bidderId, amountCents, status, idempotencyKey: null, createdAt: now, updatedAt: now,
});

describe("money", () => {
  it("parses dollars without floats", () => {
    expect(parseDollarsToCents("12.5")).toBe(1250);
    expect(parseDollarsToCents("$1,000.05")).toBe(100005);
    expect(parseDollarsToCents("0.1")).toBe(10);
    expect(parseDollarsToCents("1.234")).toBeNull();
    expect(parseDollarsToCents("abc")).toBeNull();
    expect(formatCents(100005)).toBe("$1,000.05");
  });
});

describe("bidding rules", () => {
  const actor = { userId: "buyer", campusId: "ua" };
  it("requires the minimum increment", () => {
    const l = auction();
    const high = bid("b1", "x", 5000, "active");
    expect(minNextBidCents(l, 5000)).toBe(5500);
    expect(checkBid({ listing: l, actor, amountCents: 5400, highest: high, now }).ok).toBe(false);
    expect(checkBid({ listing: l, actor, amountCents: 5500, highest: high, now }).ok).toBe(true);
  });
  it("blocks sellers, closed auctions, other campuses", () => {
    const l = auction();
    expect(checkBid({ listing: l, actor: { userId: "seller", campusId: "ua" }, amountCents: 9000, highest: null, now })).toMatchObject({ ok: false, code: "own_listing" });
    expect(checkBid({ listing: l, actor: { userId: "z", campusId: "riverbend" }, amountCents: 9000, highest: null, now })).toMatchObject({ ok: false, code: "forbidden" });
    const ended = auction({ auctionEndsAt: new Date(now.getTime() - 1) });
    expect(checkBid({ listing: ended, actor, amountCents: 9000, highest: null, now })).toMatchObject({ ok: false, code: "auction_ended" });
    const notYet = auction({ auctionStartsAt: new Date(now.getTime() + 1000) });
    expect(checkBid({ listing: notYet, actor, amountCents: 9000, highest: null, now })).toMatchObject({ ok: false, code: "auction_not_started" });
  });
  it("redirects bids at/above buy-now", () => {
    expect(checkBid({ listing: auction(), actor, amountCents: 15000, highest: null, now }).ok).toBe(false);
  });
});

describe("settlement", () => {
  it("picks the highest bid, earliest on ties", () => {
    const s = computeSettlement(auction(), [bid("a", "u1", 6000), bid("b", "u2", 7000), bid("c", "u3", 7000)]);
    expect(s.outcome).toBe("won");
    expect(s.winningBid?.id).toBe("b");
    expect(s.bidStatuses.get("b")).toBe("winning");
  });
  it("closes without sale when reserve unmet or no bids", () => {
    expect(computeSettlement(auction({ reservePriceCents: 9000 }), [bid("a", "u1", 6000)]).outcome).toBe("reserve_not_met");
    expect(computeSettlement(auction(), []).outcome).toBe("no_bids");
  });
});

describe("listing validation", () => {
  const base = { title: "Lamp", category: "lamp", condition: "good", pickupMode: "now" } as const;
  it("rejects bad auction configs", () => {
    const start = new Date();
    const r = newListingSchema.safeParse({
      ...base, saleMode: "auction",
      auction: { startingBidCents: 1000, minimumIncrementCents: 100, auctionStartsAt: start, auctionEndsAt: start, reservePriceCents: 500, buyNowPriceCents: 900 },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["auction.auctionEndsAt", "auction.reservePriceCents", "auction.buyNowPriceCents"]),
    );
  });
  it("requires a price for fixed listings only", () => {
    expect(newListingSchema.safeParse({ ...base, saleMode: "fixed", priceCents: 0 }).success).toBe(false);
    expect(newListingSchema.safeParse({ ...base, saleMode: "free" }).success).toBe(true);
  });
});

describe("cross-campus policy", () => {
  it("only explicit partners can discover; nobody transacts cross-campus by default", () => {
    expect(canViewCampus("riverbend", "ua", "riverbend")).toBe(true); // UA lists riverbend as discoverableBy
    expect(canViewCampus(null, "ua", "riverbend")).toBe(false);
    expect(canTransact({ userId: "x", campusId: "riverbend" }, "ua")).toBe(false);
    expect(visibleCampusIds({ browsingCampusId: "ua", viewerCampusId: "ua", includeNearby: true })).toEqual(["ua", "riverbend"]);
    expect(visibleCampusIds({ browsingCampusId: "ua", viewerCampusId: null, includeNearby: true })).toEqual(["ua"]);
  });
});
