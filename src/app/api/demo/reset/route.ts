import { NextResponse } from "next/server";
import { resetMockStore } from "@/data/adapters/mock";
import { dataMode } from "@/lib/env";

/** Mock mode only: reseed the in-memory store (used by e2e tests). */
export async function GET() {
  if (dataMode !== "mock") return NextResponse.json({ error: "not available" }, { status: 404 });
  resetMockStore();
  return NextResponse.json({ ok: true });
}
