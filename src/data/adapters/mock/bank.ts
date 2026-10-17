/** In-memory Furniture Bank. Mutations are synchronous after entry, so reservations can't double-book. */
import { randomUUID } from "node:crypto";
import { advanceEffects, checkReserve, nextStage } from "@/features/bank/domain";
import { formatCents } from "@/lib/money";
import type { BankRepository } from "../../bank-repository";
import type { BankItem, BankReservation, BankReservationView } from "../../bank-types";
import { fail, ok } from "../../repository";
import { mockStore, type Store } from ".";

const clone = <T>(v: T): T => structuredClone(v);
const id = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 14)}`;

function view(s: Store, r: BankReservation): BankReservationView {
  return { ...r, items: r.itemIds.map((i) => s.bankItems.find((x) => x.id === i)!).filter(Boolean) };
}

function notify(s: Store, campusId: string, userId: string, title: string, body: string) {
  s.notifications.push({ id: id("ntf"), campusId, userId, kind: "dibs_confirmed", title, body, listingId: null, readAt: null, createdAt: new Date() });
}

export function createMockBankRepository(): BankRepository {
  return {
    async listInventory(campusId) {
      return clone(mockStore().bankItems.filter((i) => i.campusId === campusId && i.status !== "retired"));
    },
    async myDeposits(actor) {
      return clone(mockStore().bankItems.filter((i) => i.consignorId === actor.userId));
    },
    async myReservations(actor) {
      const s = mockStore();
      return clone(
        s.bankReservations
          .filter((r) => r.buyerId === actor.userId && r.stage !== "cancelled")
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => view(s, r)),
      );
    },
    async deposit(actor, input) {
      const s = mockStore();
      const t = new Date();
      const n = s.bankItems.filter((i) => i.campusId === actor.campusId).length;
      const bay = `Bay ${String.fromCharCode(65 + (n % 7))}-${(n % 9) + 1}`;
      const item: BankItem = {
        id: id("bnk"),
        inventoryCode: `${actor.campusId.toUpperCase()}-${String(101 + n).padStart(4, "0")}`,
        campusId: actor.campusId,
        consignorId: actor.userId,
        ...input,
        retailCents: null,
        storageLocation: `Bank storage · ${bay}`,
        status: "available",
        cycles: 0,
        history: [
          { at: t.toISOString(), kind: "deposited", note: "Deposited by consignor" },
          { at: t.toISOString(), kind: "accepted", note: `Accepted and shelved in ${bay} (simulated)` },
        ],
        createdAt: t,
        updatedAt: t,
      };
      s.bankItems.push(item);
      return ok(clone(item));
    },
    async reserve(actor, itemIds, moveInDate) {
      const s = mockStore();
      const items = itemIds.map((i) => s.bankItems.find((x) => x.id === i)).filter((x): x is BankItem => !!x);
      const check = checkReserve(actor, items, itemIds);
      if (!check.ok) return check;
      const t = new Date();
      const r: BankReservation = {
        id: id("res"), campusId: actor.campusId, buyerId: actor.userId, itemIds, totalCents: check.value.totalCents,
        moveInDate, stage: "reserved", createdAt: t, updatedAt: t,
      };
      for (const it of items) {
        it.status = "reserved";
        it.updatedAt = t;
        it.history.push({ at: t.toISOString(), kind: "reserved", note: `Reserved for move-in ${moveInDate}` });
        notify(s, it.campusId, it.consignorId, "Your consigned item sold", `${it.title} (${it.inventoryCode}) was reserved for ${formatCents(it.priceCents)}.`);
      }
      s.bankReservations.push(r);
      return ok(clone(view(s, r)));
    },
    async advance(actor, reservationId) {
      const s = mockStore();
      const r = s.bankReservations.find((x) => x.id === reservationId);
      if (!r || r.buyerId !== actor.userId) return fail("not_found", "Reservation not found.");
      const next = nextStage(r.stage);
      if (!next) return fail("unavailable", "This reservation is complete.");
      const t = new Date();
      for (const iid of r.itemIds) {
        const it = s.bankItems.find((x) => x.id === iid);
        if (it) Object.assign(it, advanceEffects(next, r.buyerId, r.moveInDate, it, t), { updatedAt: t });
      }
      r.stage = next;
      r.updatedAt = t;
      return ok(clone(view(s, r)));
    },
    async cancel(actor, reservationId) {
      const s = mockStore();
      const r = s.bankReservations.find((x) => x.id === reservationId);
      if (!r || r.buyerId !== actor.userId) return fail("not_found", "Reservation not found.");
      if (r.stage !== "reserved" && r.stage !== "stored") return fail("conflict", "Already delivered.");
      const t = new Date();
      for (const iid of r.itemIds) {
        const it = s.bankItems.find((x) => x.id === iid);
        if (it) {
          it.status = "available";
          it.history.push({ at: t.toISOString(), kind: "cancelled", note: "Reservation cancelled — back on the shelf" });
        }
      }
      r.stage = "cancelled";
      return ok(undefined);
    },
  };
}
