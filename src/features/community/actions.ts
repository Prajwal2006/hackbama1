"use server";

import { z } from "zod";
import { getCommunity } from "@/data";
import type { NewPostInput } from "@/data/community-repository";
import { toAction, withViewer, type ActionResult } from "@/lib/actions";
import { MAX_CENTS } from "@/lib/money";
import { isPaymentMethod } from "./domain";

const base = {
  title: z.string().trim().min(3, "Add a title").max(90),
  body: z.string().trim().max(800).default(""),
  capacity: z.number().int().min(1, "At least 1 spot").max(50),
  unitPriceCents: z.number().int().min(0).max(MAX_CENTS),
  startsAt: z.coerce.date(),
};

const postSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sub"),
    ...base,
    data: z.object({ service: z.string().trim().min(2).max(60), cycle: z.enum(["monthly", "yearly"]), totalCents: z.number().int().positive().max(MAX_CENTS) }),
  }),
  z.object({
    kind: z.literal("ride"),
    ...base,
    data: z.object({
      from: z.string().trim().min(2).max(80),
      to: z.string().trim().min(2).max(80),
      trip: z.boolean(),
      returnAt: z.string().nullable().default(null),
      luggage: z.string().trim().max(60).nullable().default(null),
    }),
  }),
  z.object({
    kind: z.literal("meal"),
    ...base,
    data: z.object({
      dish: z.string().trim().min(2).max(60),
      dietary: z.array(z.string().max(20)).max(6).default([]),
      pickupSpot: z.string().trim().min(2).max(80),
      trade: z.string().trim().max(80).nullable().default(null),
    }),
  }),
]);

export async function createPostAction(campus: string, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Check the form." };
  const p = parsed.data;
  if (p.kind !== "sub" && p.startsAt.getTime() < Date.now() - 5 * 60_000) {
    return { ok: false, code: "invalid", message: "Pick a time in the future." };
  }
  return withViewer(campus, async (v) => {
    if (v.actor.campusId !== campus) return { ok: false, code: "forbidden", message: "Post at the campus you're verified at." };
    const input: NewPostInput = { ...p, imageUrl: null };
    return toAction(await getCommunity().createPost(v.actor, input), (x) => ({ id: x.id }));
  });
}

export async function joinPostAction(campus: string, postId: string, quantity: number): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getCommunity().joinPost(v.actor, String(postId), Number(quantity)), () => null));
}

export async function leavePostAction(campus: string, postId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getCommunity().leavePost(v.actor, String(postId)), () => null));
}

export async function ackMemberAction(campus: string, memberId: string, what: "sent" | "received", method: string | null): Promise<ActionResult<null>> {
  if (what !== "sent" && what !== "received") return { ok: false, code: "invalid", message: "Unknown step." };
  const m = method && isPaymentMethod(method) ? method : null;
  return withViewer(campus, async (v) => toAction(await getCommunity().ackMember(v.actor, String(memberId), what, m), () => null));
}

export async function closePostAction(campus: string, postId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getCommunity().closePost(v.actor, String(postId)), () => null));
}

const swapSchema = z.object({
  course: z.string().trim().min(2, "Course code, e.g. CS 201").max(20),
  haveSection: z.string().trim().min(1, "Your section").max(12),
  wantSection: z.string().trim().min(1, "The section you want").max(12),
  autoAccept: z.boolean().default(false),
});

export async function createSwapAction(
  campus: string,
  raw: z.input<typeof swapSchema>,
): Promise<ActionResult<{ matched: boolean; size: number }>> {
  const parsed = swapSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "invalid", message: parsed.error.issues[0]?.message ?? "Check the form." };
  return withViewer(campus, async (v) =>
    toAction(await getCommunity().createSwap(v.actor, parsed.data), (r) => ({ matched: !!r.cycle, size: r.cycle?.requests.length ?? 0 })),
  );
}

export async function confirmCycleAction(campus: string, cycleId: string): Promise<ActionResult<{ matched: boolean }>> {
  return withViewer(campus, async (v) => toAction(await getCommunity().confirmCycle(v.actor, String(cycleId)), (c) => ({ matched: c.status === "matched" })));
}

export async function cancelSwapAction(campus: string, requestId: string): Promise<ActionResult<null>> {
  return withViewer(campus, async (v) => toAction(await getCommunity().cancelSwap(v.actor, String(requestId)), () => null));
}
