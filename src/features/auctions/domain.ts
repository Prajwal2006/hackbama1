/**
 * Pure auction rules shared by every repository adapter. The server clock is
 * the only clock; nothing here trusts client-supplied prices or statuses.
 */
import { fail, ok, type Actor, type Result } from "@/data/repository";
import type { AuctionOutcome, Bid, BidStatus, Listing } from "@/data/types";
import { canTransact } from "@/lib/policy";
import { formatCents } from "@/lib/money";

export type AuctionPhase = "upcoming" | "live" | "ending" | "ended" | "settled" | "cancelled";

const ENDING_SOON_MS = 60 * 60_000;

export function auctionPhase(listing: Listing, now: Date): AuctionPhase {
  const a = listing.auction;
  if (!a) throw new Error("not an auction");
  if (listing.status === "cancelled") return "cancelled";
  if (a.settledAt) return "settled";
  if (now < a.auctionStartsAt) return "upcoming";
  if (now >= a.auctionEndsAt) return "ended";
  return a.auctionEndsAt.getTime() - now.getTime() <= ENDING_SOON_MS ? "ending" : "live";
}

export function minNextBidCents(listing: Listing, highestCents: number | null): number {
  const a = listing.auction!;
  return highestCents === null ? a.startingBidCents : highestCents + a.minimumIncrementCents;
}

/** Validate a bid against current server state. `highest` is the highest standing bid. */
export function checkBid(args: {
  listing: Listing;
  actor: Actor;
  amountCents: number;
  highest: Bid | null;
  now: Date;
}): Result<{ minCents: number }> {
  const { listing, actor, amountCents, highest, now } = args;
  if (listing.saleMode !== "auction" || !listing.auction) return fail("invalid", "This item isn't an auction.");
  if (!canTransact(actor, listing.campusId)) {
    return fail("forbidden", "Only students verified at this campus can bid here.");
  }
  if (listing.sellerId === actor.userId) return fail("own_listing", "You can't bid on your own listing.");
  if (listing.status !== "active") return fail("unavailable", "This auction is no longer open.");
  const phase = auctionPhase(listing, now);
  if (phase === "upcoming") return fail("auction_not_started", "Bidding hasn't opened yet.");
  if (phase === "ended" || phase === "settled") return fail("auction_ended", "Bidding has closed.");
  if (phase === "cancelled") return fail("unavailable", "This auction was cancelled.");
  if (!Number.isInteger(amountCents) || amountCents <= 0) return fail("invalid", "Enter a whole-cent amount.");
  const minCents = minNextBidCents(listing, highest?.amountCents ?? null);
  if (amountCents < minCents) {
    return fail("bid_too_low", `The minimum bid is now ${formatCents(minCents)}.`);
  }
  const buyNow = listing.auction.buyNowPriceCents;
  if (buyNow !== null && amountCents >= buyNow) {
    return fail("invalid", `That's at or above the buy-now price — just buy it for ${formatCents(buyNow)}.`);
  }
  if (highest && highest.bidderId === actor.userId) {
    return fail("duplicate", "You're already the highest bidder.");
  }
  return ok({ minCents });
}

export function checkBuyNow(args: { listing: Listing; actor: Actor; highest: Bid | null; now: Date }): Result<{
  priceCents: number;
}> {
  const { listing, actor, highest, now } = args;
  const a = listing.auction;
  if (listing.saleMode !== "auction" || !a) return fail("invalid", "This item isn't an auction.");
  if (a.buyNowPriceCents === null) return fail("invalid", "Buy-now isn't offered on this auction.");
  if (!canTransact(actor, listing.campusId)) return fail("forbidden", "Only students verified at this campus can buy here.");
  if (listing.sellerId === actor.userId) return fail("own_listing", "You can't buy your own listing.");
  if (listing.status !== "active") return fail("unavailable", "Someone beat you to it.");
  const phase = auctionPhase(listing, now);
  if (phase === "upcoming") return fail("auction_not_started", "This auction hasn't opened yet.");
  if (phase !== "live" && phase !== "ending") return fail("auction_ended", "This auction has closed.");
  if (highest && highest.amountCents >= a.buyNowPriceCents) {
    return fail("unavailable", "Bidding has passed the buy-now price.");
  }
  return ok({ priceCents: a.buyNowPriceCents });
}

/** Status changes when `newBid` becomes the standing high bid. */
export function statusesAfterNewHigh(bids: Bid[], newBidId: string): Map<string, BidStatus> {
  const updates = new Map<string, BidStatus>();
  for (const b of bids) {
    if (b.id === newBidId) updates.set(b.id, "active");
    else if (b.status === "active") updates.set(b.id, "outbid");
  }
  return updates;
}

export type Settlement = {
  outcome: AuctionOutcome;
  winningBid: Bid | null;
  listingStatus: "sold" | "closed";
  bidStatuses: Map<string, BidStatus>;
};

/** Decide an auction's outcome from its bids. Pure and deterministic. */
export function computeSettlement(listing: Listing, bids: Bid[]): Settlement {
  const a = listing.auction!;
  const eligible = bids
    .filter((b) => b.status === "active" || b.status === "outbid" || b.status === "winning")
    .sort((x, y) => y.amountCents - x.amountCents || x.createdAt.getTime() - y.createdAt.getTime());
  const top = eligible[0] ?? null;
  const bidStatuses = new Map<string, BidStatus>();
  if (!top) return { outcome: "no_bids", winningBid: null, listingStatus: "closed", bidStatuses };
  if (a.reservePriceCents !== null && top.amountCents < a.reservePriceCents) {
    for (const b of eligible) bidStatuses.set(b.id, "outbid");
    return { outcome: "reserve_not_met", winningBid: null, listingStatus: "closed", bidStatuses };
  }
  for (const b of eligible) bidStatuses.set(b.id, b.id === top.id ? "winning" : "outbid");
  return { outcome: "won", winningBid: top, listingStatus: "sold", bidStatuses };
}

/** Rules for sellers changing an auction's lifecycle. */
export function checkAuctionCancel(listing: Listing, bidCount: number): Result<void> {
  if (listing.saleMode !== "auction") return ok(undefined);
  if (listing.auction?.settledAt) return fail("unavailable", "This auction has already settled.");
  if (bidCount > 0) {
    return fail(
      "conflict",
      "Auctions with bids can't be cancelled — students are counting on it. Let it run out (you can decline a sale below reserve).",
    );
  }
  return ok(undefined);
}

/** Privacy-preserving bidder label: stable per listing, never the user's id. */
export function bidderLabel(listingId: string, bidderId: string, viewerId: string | null): string {
  if (viewerId && bidderId === viewerId) return "You";
  let h = 0;
  const s = `${listingId}:${bidderId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const animals = ["Otter", "Heron", "Fox", "Lynx", "Moth", "Finch", "Gecko", "Bison", "Koi", "Wren", "Yak", "Newt"];
  return `${animals[h % animals.length]} #${(h % 89) + 10}`;
}
