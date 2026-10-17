import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/data";
import { dataMode, env } from "@/lib/env";

/**
 * Settles ended auctions and expires stale dibs. Idempotent: safe to call as
 * often as you like (Vercel Cron, a GitHub Action, or curl).
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  if (dataMode === "neon" || env.cronSecret) {
    if (!env.cronSecret || req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const report = await getRepo().runMaintenance();
  return NextResponse.json({ ok: true, mode: dataMode, ...report, at: new Date().toISOString() });
}
