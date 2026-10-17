"use server";

import { getCampus } from "@/config/campuses";
import { getAr, getRepo } from "@/data";
import type { ListingStatus } from "@/data/types";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";
import { normalizeSpec } from "@/features/ar/build";
import { getStorage } from "@/lib/storage";
import { newListingSchema, type NewListingRaw } from "./schema";

export async function createListingAction(campus: string, raw: NewListingRaw): Promise<ActionResult<{ id: string }>> {
  const parsed = newListingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  return withViewer(campus, async (v) => {
    if (v.actor.campusId !== campus) {
      return { ok: false, code: "forbidden", message: "You can only list items at the campus you're verified at." };
    }
    const spot = parsed.data.pickupSpotId;
    if (spot && !getCampus(campus)?.pickupSpots.some((s) => s.id === spot)) {
      return { ok: false, code: "invalid", message: "Pick a spot from the list." };
    }
    const storage = getStorage();
    let imageUrls: string[];
    try {
      imageUrls = await Promise.all(
        parsed.data.imageUrls.map((u) => storage.putListingImage(u, { campusId: v.actor.campusId, userId: v.actor.userId })),
      );
    } catch {
      return { ok: false, code: "invalid", message: "One of the photos couldn't be uploaded." };
    }
    const { arModel } = parsed.data;
    const created = await getRepo().createListing(v.actor, { ...parsed.data, imageUrls });
    if (created.ok && arModel) {
      // The listing is already live; a failed 3D save (bad spec or DB error) must not undo it.
      try {
        await getAr().save({
          listingId: created.value.id,
          campusId: v.actor.campusId,
          sellerId: v.actor.userId,
          spec: normalizeSpec(arModel.spec),
          dimensionsCm: arModel.dimensionsCm,
        });
      } catch (e) {
        console.error("[dibs] saving AR model failed", e);
      }
    }
    return toAction(created, (l) => ({ id: l.id }));
  });
}

const ALLOWED: ListingStatus[] = ["active", "sold", "cancelled"];

export async function setListingStatusAction(
  campus: string,
  listingId: string,
  status: ListingStatus,
): Promise<ActionResult<null>> {
  if (!ALLOWED.includes(status)) return { ok: false, code: "invalid", message: "Unsupported status." };
  return withViewer(campus, async (v) =>
    toAction(await getRepo().setListingStatus(v.actor, String(listingId), status), () => null),
  );
}

export async function toggleSaveAction(campus: string, listingId: string): Promise<ActionResult<{ saved: boolean }>> {
  return withViewer(campus, async (v) => toAction(await getRepo().toggleSave(v.actor, String(listingId))));
}
