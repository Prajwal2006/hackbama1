import { z } from "zod";
import { CATEGORIES, CONDITIONS, PICKUP_MODES, SALE_MODES } from "@/data/types";
import { arModelInputSchema } from "@/features/ar/spec";
import { MAX_CENTS } from "@/lib/money";

const cents = z.number().int().nonnegative().max(MAX_CENTS);
const positiveCents = z.number().int().positive().max(MAX_CENTS);

export const MAX_AUCTION_DAYS = 21;

/**
 * Server-trusted shape of a new listing. The create form produces this after
 * converting dollar strings to cents; server actions re-validate it.
 */
export const newListingSchema = z
  .object({
    title: z.string().trim().min(3, "Give it a title (3+ characters)").max(80),
    description: z.string().trim().max(1200).default(""),
    category: z.enum(CATEGORIES),
    condition: z.enum(CONDITIONS),
    saleMode: z.enum(SALE_MODES),
    priceCents: cents.default(0),
    auction: z
      .object({
        startingBidCents: positiveCents,
        minimumIncrementCents: positiveCents,
        auctionStartsAt: z.coerce.date(),
        auctionEndsAt: z.coerce.date(),
        reservePriceCents: positiveCents.nullable().default(null),
        buyNowPriceCents: positiveCents.nullable().default(null),
      })
      .nullable()
      .default(null),
    imageUrls: z.array(z.string().max(400_000)).max(4).default([]),
    pickupMode: z.enum(PICKUP_MODES),
    handoffStart: z.coerce.date().nullable().default(null),
    handoffEnd: z.coerce.date().nullable().default(null),
    pickupSpotId: z.string().max(64).nullable().default(null),
    holdForMoveIn: z.boolean().default(false),
    locationHint: z.string().trim().max(140).nullable().default(null),
    /** Optional 3D model the seller generated from the photos; buyers can place it in their room (AR). */
    arModel: arModelInputSchema.nullable().default(null),
    /** Hue for the generated illustration, so the preview matches the posted listing. */
    artSeed: z.number().int().min(0).max(359).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.saleMode === "fixed" && v.priceCents <= 0) {
      ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Set a price, or make it free" });
    }
    if (v.saleMode !== "auction" && v.auction) {
      ctx.addIssue({ code: "custom", path: ["auction"], message: "Only auctions take auction settings" });
    }
    if (v.saleMode === "auction") {
      const a = v.auction;
      if (!a) {
        ctx.addIssue({ code: "custom", path: ["auction"], message: "Auction settings are required" });
        return;
      }
      if (a.auctionEndsAt <= a.auctionStartsAt) {
        ctx.addIssue({ code: "custom", path: ["auction", "auctionEndsAt"], message: "End must be after start" });
      }
      const maxEnd = a.auctionStartsAt.getTime() + MAX_AUCTION_DAYS * 86_400_000;
      if (a.auctionEndsAt.getTime() > maxEnd) {
        ctx.addIssue({
          code: "custom",
          path: ["auction", "auctionEndsAt"],
          message: `Auctions can run at most ${MAX_AUCTION_DAYS} days`,
        });
      }
      if (a.reservePriceCents !== null && a.reservePriceCents < a.startingBidCents) {
        ctx.addIssue({
          code: "custom",
          path: ["auction", "reservePriceCents"],
          message: "Reserve must be at least the starting bid",
        });
      }
      if (a.buyNowPriceCents !== null) {
        const floor = Math.max(a.startingBidCents, a.reservePriceCents ?? 0);
        if (a.buyNowPriceCents <= floor) {
          ctx.addIssue({
            code: "custom",
            path: ["auction", "buyNowPriceCents"],
            message: "Buy-now must be above the starting bid and reserve",
          });
        }
      }
    }
    if (v.handoffStart && v.handoffEnd && v.handoffEnd <= v.handoffStart) {
      ctx.addIssue({ code: "custom", path: ["handoffEnd"], message: "Window must end after it starts" });
    }
  });

export type NewListingInput = z.output<typeof newListingSchema>;
export type NewListingRaw = z.input<typeof newListingSchema>;

/** Server-side guard for auction start times (server clock is authoritative). */
export function validateAuctionTiming(input: NewListingInput, now: Date): string | null {
  if (input.saleMode !== "auction" || !input.auction) return null;
  // Allow a small skew for "start now" from a slow client.
  if (input.auction.auctionStartsAt.getTime() < now.getTime() - 10 * 60_000) {
    return "Auction can't start in the past";
  }
  if (input.auction.auctionEndsAt.getTime() < now.getTime() + 15 * 60_000) {
    return "Auctions must run at least 15 minutes";
  }
  return null;
}
