/** Pure rules shared by the mock and Neon community adapters. */
import { getCampus } from "@/config/campuses";
import { canTransact } from "@/lib/policy";
import { atLocal, localYmd } from "@/lib/time";
import { fail, ok, type Actor, type Result } from "@/data/repository";
import type { CommunityMember, CommunityPost, Handoff, PaymentMethod, SwapCycle, SwapRequest } from "@/data/community-types";
import { PAYMENT_METHODS } from "@/data/community-types";

export function checkJoin(args: {
  post: CommunityPost;
  actor: Actor;
  quantity: number;
  members: CommunityMember[];
  now: Date;
}): Result<{ remaining: number }> {
  const { post, actor, quantity, members, now } = args;
  if (!canTransact(actor, post.campusId)) return fail("forbidden", "Only students at this campus can join.");
  if (post.ownerId === actor.userId) return fail("own_listing", "It's your post.");
  if (post.status === "cancelled" || post.status === "closed") return fail("unavailable", "This is closed.");
  if (post.kind !== "sub" && post.startsAt < now) return fail("unavailable", "This already happened.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6) return fail("invalid", "Pick 1–6.");
  const active = members.filter((m) => m.status === "joined");
  if (active.some((m) => m.userId === actor.userId)) return fail("duplicate", "You're already in.");
  const taken = active.reduce((s, m) => s + m.quantity, 0);
  const remaining = post.capacity - taken;
  if (quantity > remaining) return fail("unavailable", remaining > 0 ? `Only ${remaining} left.` : "It's full.");
  return ok({ remaining: remaining - quantity });
}

export function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === "string" && (PAYMENT_METHODS as readonly string[]).includes(v);
}

/** Who may acknowledge what on a handoff. */
export function checkHandoffAck(h: Handoff, actor: Actor, what: "sent" | "received" | "complete" | "schedule"): Result<void> {
  if (h.campusId !== actor.campusId) return fail("not_found", "Handoff not found.");
  if (h.status !== "pending") return fail("unavailable", "This handoff is closed.");
  const isBuyer = h.buyerId === actor.userId;
  const isSeller = h.sellerId === actor.userId;
  if (!isBuyer && !isSeller) return fail("forbidden", "Not your handoff.");
  if (what === "sent" && !isBuyer) return fail("forbidden", "Only the buyer marks payment sent.");
  if (what === "received" && !isSeller) return fail("forbidden", "Only the seller confirms payment received.");
  if (what === "complete") {
    if (!isSeller) return fail("forbidden", "The seller confirms the handoff.");
    if (h.amountCents > 0 && !h.paymentReceivedAt) return fail("conflict", "Confirm you received payment first.");
  }
  if ((what === "sent" || what === "received") && h.amountCents === 0) return fail("invalid", "It's free — nothing to pay.");
  return ok(undefined);
}

/** Validate a pickup time against the campus calendar. */
export function checkSchedule(args: {
  phase: "move_out" | "move_in";
  at: Date;
  now: Date;
  moveInDate: string;
  holdForMoveIn: boolean;
}): Result<void> {
  const { phase, at, now, moveInDate, holdForMoveIn } = args;
  if (Number.isNaN(at.getTime()) || at.getTime() < now.getTime() - 5 * 60_000) return fail("invalid", "Pick a time in the future.");
  const moveIn = new Date(`${moveInDate}T00:00:00Z`).getTime();
  if (phase === "move_in") {
    if (!holdForMoveIn) return fail("invalid", "The seller can't hold this one until move-in.");
    if (at.getTime() < moveIn - 3 * 86_400_000) return fail("invalid", "Move-in pickups start 3 days before move-in.");
  }
  if (at.getTime() > moveIn + 14 * 86_400_000) return fail("invalid", "That's too far out.");
  return ok(undefined);
}

/**
 * Find a swap cycle containing `start`: start gives `have` to whoever wants it,
 * and so on, until someone gives back what start wants. Prefers the shortest
 * cycle (2-way before 3-way, max 4 people). Pure; inputs are open requests for one course.
 */
export function findSwapCycle(start: SwapRequest, open: SwapRequest[], maxLen = 4): SwapRequest[] | null {
  const pool = open.filter((r) => r.course === start.course && r.status === "open" && r.userId !== start.userId);
  let frontier: SwapRequest[][] = [[start]];
  for (let depth = 1; depth < maxLen; depth++) {
    const next: SwapRequest[][] = [];
    for (const path of frontier) {
      const last = path[path.length - 1];
      // Someone who wants what `last` has.
      for (const r of pool) {
        if (r.wantSection !== last.haveSection) continue;
        if (path.some((p) => p.id === r.id || p.userId === r.userId)) continue;
        const candidate = [...path, r];
        if (r.haveSection === start.wantSection) return candidate;
        next.push(candidate);
      }
    }
    frontier = next;
  }
  return null;
}

/** Swap moment: 7:00 AM tomorrow, campus time — registration systems are quiet. */
export function nextSwapWindow(now: Date, campusId: string) {
  const tz = getCampus(campusId)?.timezone ?? "America/Chicago";
  return atLocal(localYmd(now, tz, 1), 7, 0, tz);
}

/** Settle confirmations into a matched cycle. Mutates arguments. */
export function applyConfirm(cycle: SwapCycle, userId: string, requests: SwapRequest[], now: Date) {
  if (!cycle.confirmedBy.includes(userId)) cycle.confirmedBy.push(userId);
  const all = requests.every((r) => cycle.confirmedBy.includes(r.userId));
  if (all) {
    cycle.status = "matched";
    cycle.swapAt = nextSwapWindow(now, cycle.campusId);
    for (const r of requests) r.status = "matched";
  }
  return all;
}
