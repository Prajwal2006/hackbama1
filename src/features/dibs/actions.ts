"use server";

import { getRepo } from "@/data";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";

export async function callDibsAction(
  campus: string,
  listingId: string,
): Promise<ActionResult<{ dibId: string; expiresAt: string }>> {
  return withViewer(campus, async (v) =>
    toAction(await getRepo().callDibs(v.actor, String(listingId)), (r) => ({
      dibId: r.dib.id,
      expiresAt: r.dib.expiresAt.toISOString(),
    })),
  );
}

export async function cancelDibsAction(campus: string, dibId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getRepo().cancelDibs(v.actor, String(dibId)), () => null));
}

export async function completeDibsAction(campus: string, dibId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getRepo().completeDibs(v.actor, String(dibId)), () => null));
}
