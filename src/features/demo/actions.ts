"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/data";
import { mockEndAuctionNow, resetMockStore } from "@/data/adapters/mock";
import { dataMode } from "@/lib/env";
import type { ActionResult } from "@/lib/actions";

/** Demo tools. Every action here is a no-op outside mock data mode. */

export async function resetDemoAction(): Promise<ActionResult<null>> {
  if (dataMode !== "mock") return { ok: false, code: "forbidden", message: "Reset is only available in demo mode." };
  resetMockStore();
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function endAuctionNowAction(listingId: string): Promise<ActionResult<null>> {
  if (dataMode !== "mock") return { ok: false, code: "forbidden", message: "Only available in demo mode." };
  const r = mockEndAuctionNow(String(listingId));
  revalidatePath("/", "layout");
  return r.ok ? { ok: true, data: null } : { ok: false, code: r.code, message: r.message };
}

export async function runMaintenanceAction(): Promise<ActionResult<{ expiredDibs: number; settledAuctions: number }>> {
  const report = await getRepo().runMaintenance();
  revalidatePath("/", "layout");
  return { ok: true, data: report };
}
