"use server";

import { revalidatePath } from "next/cache";
import { getRepo } from "@/data";
import { resetMockStore } from "@/data/adapters/mock";
import { DEMO_STUDENT_ID } from "@/data/seed";
import { setSession } from "@/lib/auth/session";
import { dataMode, env } from "@/lib/env";
import type { ActionResult } from "@/lib/actions";

/** Demo tools. Destructive ones are no-ops on Neon unless DIBS_ALLOW_DEMO_RESET=1. */

async function resetData(): Promise<boolean> {
  if (dataMode === "mock") {
    resetMockStore();
    const { resetMockCodes } = await import("@/data/adapters/mock/auth");
    resetMockCodes();
    return true;
  }
  if (!env.allowNeonReset) return false;
  const { seedNeon } = await import("@/data/seed/neon");
  await seedNeon(env.databaseUrl, { reset: true });
  return true;
}

export async function resetDemoAction(): Promise<ActionResult<null>> {
  if (!(await resetData())) return { ok: false, code: "forbidden", message: "Reset is disabled for this database." };
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

/** Starts the judge tour: fresh data (when allowed) + signed in as the UA demo student. */
export async function prepareTourAction(): Promise<ActionResult<{ reset: boolean }>> {
  const reset = await resetData();
  const userId = DEMO_STUDENT_ID.ua;
  const p = await getRepo().getProfile(userId);
  await setSession(
    { userId, campusId: "ua", displayName: p?.displayName ?? "Demo Student", email: null, verifiedAt: new Date().toISOString(), method: "demo" },
    1,
  );
  revalidatePath("/", "layout");
  return { ok: true, data: { reset } };
}

export async function endAuctionNowAction(listingId: string): Promise<ActionResult<null>> {
  if (dataMode !== "mock" && !env.allowNeonReset) return { ok: false, code: "forbidden", message: "Only available in demo mode." };
  const r = await getRepo().demoEndAuction(String(listingId));
  revalidatePath("/", "layout");
  return r.ok ? { ok: true, data: null } : { ok: false, code: r.code, message: r.message };
}

export async function runMaintenanceAction(): Promise<ActionResult<{ expiredDibs: number; settledAuctions: number }>> {
  const report = await getRepo().runMaintenance();
  revalidatePath("/", "layout");
  return { ok: true, data: report };
}
