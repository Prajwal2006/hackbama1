"use server";

import { getRepo } from "@/data";
import { withViewer, type ActionResult } from "@/lib/actions";

export async function markAllReadAction(campus: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => {
    await getRepo().markNotificationsRead(v.actor);
    return { ok: true, data: null };
  });
}
