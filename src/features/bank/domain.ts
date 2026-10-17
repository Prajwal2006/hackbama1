/** Pure Furniture Bank rules shared by mock and Neon adapters. */
import type { BankCategory, BankItem, ReservationStage } from "@/data/bank-types";
import { RESERVATION_STAGES } from "@/data/bank-types";
import { fail, ok, type Actor, type Result } from "@/data/repository";
import { canTransact } from "@/lib/policy";

/** All-or-nothing: every item must be available, on this campus, and not your own. */
export function checkReserve(actor: Actor, items: BankItem[], ids: string[]): Result<{ totalCents: number }> {
  if (!ids.length) return fail("invalid", "Pick at least one item.");
  if (new Set(ids).size !== ids.length) return fail("invalid", "Duplicate item.");
  if (items.length !== ids.length) return fail("not_found", "Some items no longer exist.");
  for (const it of items) {
    if (!canTransact(actor, it.campusId)) return fail("forbidden", "Only students at this campus can reserve.");
    if (it.consignorId === actor.userId) return fail("own_listing", `${it.title} is yours.`);
    if (it.status !== "available") return fail("unavailable", `${it.title} was just reserved by someone else.`);
  }
  return ok({ totalCents: items.reduce((s, i) => s + i.priceCents, 0) });
}

export function nextStage(stage: ReservationStage): ReservationStage | null {
  if (stage === "cancelled") return null;
  const i = RESERVATION_STAGES.indexOf(stage);
  return i >= 0 && i < RESERVATION_STAGES.length - 1 ? RESERVATION_STAGES[i + 1] : null;
}

/**
 * The "$200 dorm" matcher: cheapest available item per requested category,
 * in priority order, dropping lower-priority categories that don't fit the budget.
 */
export function buildBundle(inventory: BankItem[], categories: BankCategory[], budgetCents: number, excludeOwnerId?: string) {
  const picked: BankItem[] = [];
  const skipped: { category: BankCategory; reason: "none" | "budget" }[] = [];
  let total = 0;
  for (const cat of categories) {
    const options = inventory
      .filter((i) => i.category === cat && i.status === "available" && i.consignorId !== excludeOwnerId)
      .sort((a, b) => a.priceCents - b.priceCents);
    if (!options.length) {
      skipped.push({ category: cat, reason: "none" });
      continue;
    }
    // Best item that still fits: prefer better condition when within budget.
    const fits = options.filter((o) => total + o.priceCents <= budgetCents);
    if (!fits.length) {
      skipped.push({ category: cat, reason: "budget" });
      continue;
    }
    const rank = { like_new: 0, good: 1, fair: 2 } as const;
    const remainingCats = categories.length - categories.indexOf(cat) - 1;
    // With categories still to fill, take the cheapest; for the last one, upgrade condition if affordable.
    const choice = remainingCats > 0 ? fits[0] : [...fits].sort((a, b) => rank[a.condition] - rank[b.condition] || a.priceCents - b.priceCents)[0];
    picked.push(choice);
    total += choice.priceCents;
  }
  return { items: picked, totalCents: total, skipped };
}

/** What advancing a reservation does to its items. Shared by both adapters. */
export function advanceEffects(
  stage: ReservationStage,
  buyerId: string,
  moveInDate: string,
  item: BankItem,
  now: Date,
): Pick<BankItem, "status" | "consignorId" | "cycles" | "history" | "storageLocation"> {
  const at = now.toISOString();
  const base = { status: item.status, consignorId: item.consignorId, cycles: item.cycles, storageLocation: item.storageLocation, history: [...item.history] };
  if (stage === "stored") {
    base.history.push({ at, kind: "stored", note: `Held over summer at ${item.storageLocation ?? "bank storage"} (simulated)` });
  } else if (stage === "delivered") {
    base.status = "delivered";
    base.cycles = item.cycles + 1;
    base.history.push({ at, kind: "delivered", note: `Delivered for move-in ${moveInDate} (simulated)` });
  } else if (stage === "returned") {
    base.status = "available";
    base.consignorId = buyerId;
    base.history.push({ at, kind: "returned", note: "Returned to the bank — back in circulation for the next cohort" });
  }
  return base;
}
