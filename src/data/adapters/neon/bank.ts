/** Neon Furniture Bank. Reservations lock every requested item row (FOR UPDATE) — all or nothing. */
import { neon, Pool } from "@neondatabase/serverless";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { advanceEffects, checkReserve, nextStage } from "@/features/bank/domain";
import { formatCents } from "@/lib/money";
import type { BankRepository } from "../../bank-repository";
import type { BankCategory, BankItem, BankReservation, BankReservationView } from "../../bank-types";
import { fail, ok, type Result } from "../../repository";
import * as schema from "../../schema";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
const { bankItems, bankReservations, notifications } = schema;
const nid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
const toItem = (r: typeof bankItems.$inferSelect): BankItem => ({ ...r, category: r.category as BankCategory });
const toRes = (r: typeof bankReservations.$inferSelect): BankReservation => ({ ...r });

class Abort extends Error {
  constructor(public result: Result<never>) {
    super("abort");
  }
}

export function createNeonBankRepository(databaseUrl: string): BankRepository {
  const http = drizzleHttp({ client: neon(databaseUrl), schema }) as unknown as Db;

  async function tx<T>(fn: (db: Db) => Promise<Result<T>>): Promise<Result<T>> {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const db = drizzleWs({ client: pool, schema });
      return await db.transaction(async (t) => {
        const r = await fn(t as unknown as Db);
        if (!r.ok) throw new Abort(r as Result<never>);
        return r;
      });
    } catch (e) {
      if (e instanceof Abort) return e.result;
      throw e;
    } finally {
      await pool.end();
    }
  }

  async function view(db: Db, r: BankReservation): Promise<BankReservationView> {
    const items = (await db.select().from(bankItems).where(inArray(bankItems.id, r.itemIds))).map(toItem);
    return { ...r, items: r.itemIds.map((i) => items.find((x) => x.id === i)!).filter(Boolean) };
  }

  return {
    async listInventory(campusId) {
      return (await http.select().from(bankItems).where(and(eq(bankItems.campusId, campusId), ne(bankItems.status, "retired")))).map(toItem);
    },
    async myDeposits(actor) {
      return (await http.select().from(bankItems).where(eq(bankItems.consignorId, actor.userId))).map(toItem);
    },
    async myReservations(actor) {
      const rows = await http
        .select()
        .from(bankReservations)
        .where(and(eq(bankReservations.buyerId, actor.userId), ne(bankReservations.stage, "cancelled")))
        .orderBy(desc(bankReservations.createdAt));
      return Promise.all(rows.map((r) => view(http, toRes(r))));
    },
    async deposit(actor, input) {
      return tx(async (db) => {
        const existing = await db.select({ id: bankItems.id }).from(bankItems).where(eq(bankItems.campusId, actor.campusId));
        const n = existing.length;
        const bay = `Bay ${String.fromCharCode(65 + (n % 7))}-${(n % 9) + 1}`;
        const now = new Date().toISOString();
        const [row] = await db
          .insert(bankItems)
          .values({
            id: nid("bnk"),
            inventoryCode: `${actor.campusId.toUpperCase()}-${String(101 + n).padStart(4, "0")}`,
            campusId: actor.campusId,
            consignorId: actor.userId,
            ...input,
            storageLocation: `Bank storage · ${bay}`,
            status: "available",
            history: [
              { at: now, kind: "deposited", note: "Deposited by consignor" },
              { at: now, kind: "accepted", note: `Accepted and shelved in ${bay} (simulated)` },
            ],
          })
          .returning();
        return ok(toItem(row));
      });
    },
    async reserve(actor, itemIds, moveInDate) {
      const r = await tx(async (db) => {
        const items = (await db.select().from(bankItems).where(inArray(bankItems.id, itemIds)).for("update")).map(toItem);
        const check = checkReserve(actor, items, itemIds);
        if (!check.ok) return check;
        const now = new Date();
        const [res] = await db
          .insert(bankReservations)
          .values({ id: nid("res"), campusId: actor.campusId, buyerId: actor.userId, itemIds, totalCents: check.value.totalCents, moveInDate })
          .returning();
        for (const it of items) {
          await db
            .update(bankItems)
            .set({ status: "reserved", updatedAt: now, history: [...it.history, { at: now.toISOString(), kind: "reserved", note: `Reserved for move-in ${moveInDate}` }] })
            .where(eq(bankItems.id, it.id));
          await db.insert(notifications).values({
            id: nid("ntf"), campusId: it.campusId, userId: it.consignorId, kind: "dibs_confirmed", listingId: null,
            title: "Your consigned item sold", body: `${it.title} (${it.inventoryCode}) was reserved for ${formatCents(it.priceCents)}.`,
          });
        }
        return ok(toRes(res));
      });
      if (!r.ok) return r;
      return ok(await view(http, r.value));
    },
    async advance(actor, reservationId) {
      const r = await tx(async (db) => {
        const [row] = await db.select().from(bankReservations).where(eq(bankReservations.id, reservationId)).for("update");
        if (!row || row.buyerId !== actor.userId) return fail("not_found", "Reservation not found.");
        const next = nextStage(row.stage);
        if (!next) return fail("unavailable", "This reservation is complete.");
        const now = new Date();
        const items = (await db.select().from(bankItems).where(inArray(bankItems.id, row.itemIds)).for("update")).map(toItem);
        for (const it of items) {
          await db.update(bankItems).set({ ...advanceEffects(next, row.buyerId, row.moveInDate, it, now), updatedAt: now }).where(eq(bankItems.id, it.id));
        }
        const [updated] = await db.update(bankReservations).set({ stage: next, updatedAt: now }).where(eq(bankReservations.id, row.id)).returning();
        return ok(toRes(updated));
      });
      if (!r.ok) return r;
      return ok(await view(http, r.value));
    },
    async cancel(actor, reservationId) {
      return tx(async (db) => {
        const [row] = await db.select().from(bankReservations).where(eq(bankReservations.id, reservationId)).for("update");
        if (!row || row.buyerId !== actor.userId) return fail("not_found", "Reservation not found.");
        if (row.stage !== "reserved" && row.stage !== "stored") return fail("conflict", "Already delivered.");
        const now = new Date();
        const items = (await db.select().from(bankItems).where(inArray(bankItems.id, row.itemIds)).for("update")).map(toItem);
        for (const it of items) {
          await db
            .update(bankItems)
            .set({ status: "available", updatedAt: now, history: [...it.history, { at: now.toISOString(), kind: "cancelled", note: "Reservation cancelled — back on the shelf" }] })
            .where(eq(bankItems.id, it.id));
        }
        await db.update(bankReservations).set({ stage: "cancelled", updatedAt: now }).where(eq(bankReservations.id, row.id));
        return ok(undefined);
      });
    },
  };
}
