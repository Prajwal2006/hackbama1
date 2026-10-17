"use server";

import { getRepo } from "@/data";
import { isPaymentMethod } from "@/features/community/domain";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";

export async function scheduleHandoffAction(
  campus: string,
  handoffId: string,
  phase: "move_out" | "move_in",
  atIso: string,
): Promise<ActionResult<null>> {
  if (phase !== "move_out" && phase !== "move_in") return { ok: false, code: "invalid", message: "Pick move-out or move-in." };
  const at = new Date(atIso);
  if (Number.isNaN(at.getTime())) return { ok: false, code: "invalid", message: "Pick a valid time." };
  return withViewer(campus, async (v) => toAction(await getRepo().scheduleHandoff(v.actor, String(handoffId), phase, at), () => null));
}

export async function ackHandoffAction(
  campus: string,
  handoffId: string,
  what: "sent" | "received",
  method: string | null,
): Promise<ActionResult<null>> {
  if (what !== "sent" && what !== "received") return { ok: false, code: "invalid", message: "Unknown step." };
  const m = method && isPaymentMethod(method) ? method : null;
  return withViewer(campus, async (v) => toAction(await getRepo().ackHandoff(v.actor, String(handoffId), what, m), () => null));
}

export async function completeHandoffAction(campus: string, handoffId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getRepo().completeHandoff(v.actor, String(handoffId)), () => null));
}
