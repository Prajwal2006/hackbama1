"use server";

import { z } from "zod";
import { getBank } from "@/data";
import { BANK_CATEGORIES } from "@/data/bank-types";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";
import { MAX_CENTS } from "@/lib/money";
import { getStorage } from "@/lib/storage";

const depositSchema = z.object({
  title: z.string().trim().min(3, "Name the item").max(80),
  category: z.enum(BANK_CATEGORIES),
  condition: z.enum(["like_new", "good", "fair"]),
  widthCm: z.number().int().min(5).max(400),
  depthCm: z.number().int().min(1).max(400),
  heightCm: z.number().int().min(1).max(300),
  priceCents: z.number().int().min(0).max(MAX_CENTS),
  imageUrl: z.string().max(400_000).nullable(),
});

export async function depositAction(campus: string, raw: z.input<typeof depositSchema>): Promise<ActionResult<{ code: string; location: string }>> {
  const parsed = depositSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Check the form." };
  return withViewer(campus, async (v) => {
    if (v.actor.campusId !== campus) return { ok: false, code: "forbidden", message: "Deposit at the campus you're verified at." };
    let imageUrl: string | null = parsed.data.imageUrl;
    if (imageUrl?.startsWith("data:")) {
      try {
        imageUrl = await getStorage().putListingImage(imageUrl, { campusId: v.actor.campusId, userId: v.actor.userId });
      } catch {
        return { ok: false, code: "invalid", message: "The photo couldn't be uploaded." };
      }
    }
    return toAction(await getBank().deposit(v.actor, { ...parsed.data, imageUrl }), (i) => ({ code: i.inventoryCode, location: i.storageLocation ?? "" }));
  });
}

export async function reserveBundleAction(campus: string, itemIds: string[], moveInDate: string): Promise<ActionResult<{ id: string; totalCents: number }>> {
  const ids = z.array(z.string().min(1).max(64)).min(1).max(12).safeParse(itemIds);
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(moveInDate);
  if (!ids.success || !date.success) return { ok: false, code: "invalid", message: "Pick items and a move-in date." };
  return withViewer(campus, async (v) => toAction(await getBank().reserve(v.actor, ids.data, date.data), (r) => ({ id: r.id, totalCents: r.totalCents })));
}

export async function advanceReservationAction(campus: string, reservationId: string): Promise<ActionResult<{ stage: string }>> {
  return withViewer(campus, async (v) => toAction(await getBank().advance(v.actor, String(reservationId)), (r) => ({ stage: r.stage })));
}

export async function cancelReservationAction(campus: string, reservationId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getBank().cancel(v.actor, String(reservationId)), () => null));
}
