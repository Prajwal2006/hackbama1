/** Pure rules for calling dibs (fixed-price and free listings). */
import { getCampus } from "@/config/campuses";
import { fail, ok, type Actor, type Result } from "@/data/repository";
import type { Dib, Listing } from "@/data/types";
import { canTransact } from "@/lib/policy";

export function holdHours(campusId: string) {
  return getCampus(campusId)?.dibsHoldHours ?? 24;
}

export function dibsExpiry(campusId: string, now: Date) {
  return new Date(now.getTime() + holdHours(campusId) * 3_600_000);
}

export function checkClaim(args: { listing: Listing; actor: Actor; activeDib: Dib | null; now: Date }): Result<void> {
  const { listing, actor, activeDib, now } = args;
  if (listing.saleMode === "auction") return fail("invalid", "Auctions are won by bidding, not dibs.");
  if (!canTransact(actor, listing.campusId)) {
    return fail("forbidden", "Only students verified at this campus can call dibs here.");
  }
  if (listing.sellerId === actor.userId) return fail("own_listing", "That's your own listing.");
  if (activeDib && activeDib.expiresAt > now) {
    return activeDib.buyerId === actor.userId
      ? fail("duplicate", "You already have dibs on this.")
      : fail("unavailable", "Someone already called dibs.");
  }
  if (listing.status !== "active") return fail("unavailable", "This item isn't available.");
  return ok(undefined);
}

export function isExpired(dib: Dib, now: Date) {
  return dib.status === "active" && dib.expiresAt <= now;
}
