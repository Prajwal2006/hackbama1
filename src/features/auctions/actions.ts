"use server";

import { z } from "zod";
import { getRepo } from "@/data";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";

const bidInput = z.object({
  listingId: z.string().min(1).max(64),
  amountCents: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(64),
  expectedMinCents: z.number().int().positive().optional(),
});

export async function placeBidAction(
  campus: string,
  raw: z.input<typeof bidInput>,
): Promise<ActionResult<{ bidId: string; amountCents: number; highestBidCents: number | null; bidCount: number }>> {
  const parsed = bidInput.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", message: "That bid doesn't look right." };
  return withViewer(campus, async (v) =>
    toAction(await getRepo().placeBid(v.actor, parsed.data), (r) => ({
      bidId: r.bid.id,
      amountCents: r.bid.amountCents,
      highestBidCents: r.listing.highestBidCents,
      bidCount: r.listing.bidCount,
    })),
  );
}

export async function buyNowAction(campus: string, listingId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getRepo().buyNow(v.actor, String(listingId)), () => null));
}
