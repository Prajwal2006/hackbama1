/**
 * Neon community repository. Joins lock the post row (`FOR UPDATE`) so seats /
 * portions can't be oversold; swap matching locks the course's open requests.
 */
import { neon, Pool } from "@neondatabase/serverless";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { applyConfirm, checkJoin, findSwapCycle } from "@/features/community/domain";
import { formatCents } from "@/lib/money";
import type { CommunityRepository } from "../../community-repository";
import type {
  CommunityMember,
  CommunityPost,
  CycleView,
  PaymentMethod,
  PostView,
  SwapCycle,
  SwapRequest,
  SwapView,
} from "../../community-types";
import { fail, ok, type Result } from "../../repository";
import * as schema from "../../schema";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
const { communityPosts: posts, communityMembers: members, swapRequests, swapCycles, profiles, notifications } = schema;
const nid = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 14)}`;

class Abort extends Error {
  constructor(public result: Result<never>) {
    super("abort");
  }
}

const toMember = (m: typeof members.$inferSelect): CommunityMember => ({ ...m, paymentMethod: m.paymentMethod as PaymentMethod | null });
const toPost = (p: typeof posts.$inferSelect): CommunityPost => ({ ...p });

async function names(db: Db, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db.select({ id: profiles.id, name: profiles.displayName }).from(profiles).where(inArray(profiles.id, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function views(db: Db, rows: (typeof posts.$inferSelect)[]): Promise<PostView[]> {
  if (!rows.length) return [];
  const ms = await db
    .select()
    .from(members)
    .where(and(inArray(members.postId, rows.map((r) => r.id)), eq(members.status, "joined")))
    .orderBy(asc(members.createdAt));
  const nm = await names(db, [...rows.map((r) => r.ownerId), ...ms.map((m) => m.userId)]);
  return rows.map((p) => {
    const mine = ms.filter((m) => m.postId === p.id).map((m) => ({ ...toMember(m), userName: nm.get(m.userId) ?? "Student" }));
    return { ...toPost(p), ownerName: nm.get(p.ownerId) ?? "Student", taken: mine.reduce((n, m) => n + m.quantity, 0), members: mine };
  });
}

function notify(db: Db, campusId: string, userId: string, title: string, body: string) {
  return db.insert(notifications).values({ id: nid("ntf"), campusId, userId, kind: "dibs_confirmed", title, body, listingId: null });
}

const toSwap = (r: typeof swapRequests.$inferSelect): SwapRequest => ({ ...r });
const toCycle = (c: typeof swapCycles.$inferSelect): SwapCycle => ({ ...c });

export function createNeonCommunityRepository(databaseUrl: string): CommunityRepository {
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
      const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
      if (code === "23505") return fail("conflict", "Someone else got there first.");
      throw e;
    } finally {
      await pool.end();
    }
  }

  async function swapViews(db: Db, rows: SwapRequest[]): Promise<SwapView[]> {
    const nm = await names(db, rows.map((r) => r.userId));
    return rows.map((r) => ({ ...r, userName: nm.get(r.userId) ?? "Student" }));
  }
  async function cycleView(db: Db, c: SwapCycle): Promise<CycleView> {
    const rows = (await db.select().from(swapRequests).where(inArray(swapRequests.id, c.requestIds))).map(toSwap);
    const ordered = c.requestIds.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
    return { ...c, requests: await swapViews(db, ordered) };
  }

  return {
    async listPosts(campusId, kind) {
      const rows = await http
        .select()
        .from(posts)
        .where(and(eq(posts.campusId, campusId), eq(posts.kind, kind), ne(posts.status, "cancelled")))
        .orderBy(kind === "sub" ? desc(posts.createdAt) : asc(posts.startsAt))
        .limit(100);
      return views(http, rows);
    },

    async getPost(id) {
      const rows = await http.select().from(posts).where(eq(posts.id, id));
      return (await views(http, rows))[0] ?? null;
    },

    async createPost(actor, input) {
      const [row] = await http
        .insert(posts)
        .values({ id: nid("pst"), campusId: actor.campusId, ownerId: actor.userId, ...input })
        .returning();
      return ok(toPost(row));
    },

    async joinPost(actor, postId, quantity) {
      const r = await tx(async (db) => {
        const [p] = await db.select().from(posts).where(eq(posts.id, postId)).for("update");
        if (!p) return fail("not_found", "Not found.");
        const ms = (await db.select().from(members).where(eq(members.postId, p.id))).map(toMember);
        const check = checkJoin({ post: toPost(p), actor, quantity, members: ms, now: new Date() });
        if (!check.ok) return check;
        await db.insert(members).values({ id: nid("mem"), postId: p.id, campusId: p.campusId, userId: actor.userId, quantity });
        if (check.value.remaining === 0) await db.update(posts).set({ status: "full", updatedAt: new Date() }).where(eq(posts.id, p.id));
        const nm = await names(db, [actor.userId]);
        await notify(db, p.campusId, p.ownerId, `${nm.get(actor.userId) ?? "Someone"} joined`, `${p.title} — ${quantity} × ${p.unitPriceCents ? formatCents(p.unitPriceCents) : "free"}.`);
        return ok(p.id);
      });
      if (!r.ok) return r;
      return ok((await this.getPost(postId))!);
    },

    async leavePost(actor, postId) {
      const r = await tx(async (db) => {
        const [p] = await db.select().from(posts).where(eq(posts.id, postId)).for("update");
        if (!p) return fail("not_found", "Not found.");
        const [m] = await db.select().from(members).where(and(eq(members.postId, postId), eq(members.userId, actor.userId), eq(members.status, "joined")));
        if (!m) return fail("not_found", "You're not in this.");
        if (m.paymentReceivedAt) return fail("conflict", "The owner already confirmed your payment — sort it out with them first.");
        await db.update(members).set({ status: "left", updatedAt: new Date() }).where(eq(members.id, m.id));
        if (p.status === "full") await db.update(posts).set({ status: "open", updatedAt: new Date() }).where(eq(posts.id, p.id));
        return ok(p.id);
      });
      if (!r.ok) return r;
      return ok((await this.getPost(postId))!);
    },

    async ackMember(actor, memberId, what, method) {
      const [m] = await http.select().from(members).where(eq(members.id, memberId));
      const [p] = m ? await http.select().from(posts).where(eq(posts.id, m.postId)) : [];
      if (!m || !p || p.campusId !== actor.campusId) return fail("not_found", "Not found.");
      if (p.unitPriceCents === 0) return fail("invalid", "It's free — nothing to pay.");
      const now = new Date();
      const nm = await names(http, [m.userId, p.ownerId]);
      if (what === "sent") {
        if (m.userId !== actor.userId) return fail("forbidden", "Only the member marks payment sent.");
        await http.update(members).set({ paymentSentAt: now, paymentMethod: method ?? m.paymentMethod, updatedAt: now }).where(eq(members.id, m.id));
        await notify(http, p.campusId, p.ownerId, "Payment sent", `${nm.get(m.userId)} sent ${formatCents(p.unitPriceCents * m.quantity)} for ${p.title}${method ? ` via ${method}` : ""}.`);
      } else {
        if (p.ownerId !== actor.userId) return fail("forbidden", "Only the organizer confirms payment received.");
        await http.update(members).set({ paymentReceivedAt: now, updatedAt: now }).where(eq(members.id, m.id));
        await notify(http, p.campusId, m.userId, "Payment received", `${nm.get(p.ownerId)} confirmed your payment for ${p.title}.`);
      }
      return ok((await this.getPost(p.id))!);
    },

    async closePost(actor, postId) {
      const [p] = await http.select().from(posts).where(eq(posts.id, postId));
      if (!p || p.campusId !== actor.campusId) return fail("not_found", "Not found.");
      if (p.ownerId !== actor.userId) return fail("forbidden", "Only the organizer can close this.");
      await http.update(posts).set({ status: "closed", updatedAt: new Date() }).where(eq(posts.id, postId));
      return ok((await this.getPost(postId))!);
    },

    async listSwaps(campusId) {
      const rows = (await http.select().from(swapRequests).where(and(eq(swapRequests.campusId, campusId), ne(swapRequests.status, "cancelled"))).orderBy(desc(swapRequests.createdAt))).map(toSwap);
      return swapViews(http, rows);
    },

    async mySwaps(actor) {
      const rows = (await http.select().from(swapRequests).where(and(eq(swapRequests.userId, actor.userId), ne(swapRequests.status, "cancelled")))).map(toSwap);
      const cycleIds = [...new Set(rows.map((r) => r.cycleId).filter((x): x is string => !!x))];
      const cycles = cycleIds.length
        ? (await http.select().from(swapCycles).where(and(inArray(swapCycles.id, cycleIds), ne(swapCycles.status, "cancelled")))).map(toCycle)
        : [];
      return { requests: await swapViews(http, rows), cycles: await Promise.all(cycles.map((c) => cycleView(http, c))) };
    },

    async createSwap(actor, input) {
      const course = input.course.trim().toUpperCase().replace(/\s+/g, " ");
      const have = input.haveSection.trim().toUpperCase();
      const want = input.wantSection.trim().toUpperCase();
      if (!course || !have || !want) return fail("invalid", "Fill in course and both sections.");
      if (have === want) return fail("invalid", "You already have that section.");
      const r = await tx(async (db) => {
        // Serialize matching per course.
        await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`${actor.campusId}:${course}`}))`);
        const existing = await db
          .select({ id: swapRequests.id })
          .from(swapRequests)
          .where(and(eq(swapRequests.userId, actor.userId), eq(swapRequests.course, course), inArray(swapRequests.status, ["open", "proposed", "matched"])));
        if (existing.length) return fail("duplicate", "You already have an open swap for this course.");
        const [row] = await db
          .insert(swapRequests)
          .values({ id: nid("swp"), campusId: actor.campusId, userId: actor.userId, course, haveSection: have, wantSection: want, autoAccept: input.autoAccept })
          .returning();
        const request = toSwap(row);
        const open = (await db.select().from(swapRequests).where(and(eq(swapRequests.campusId, actor.campusId), eq(swapRequests.course, course), eq(swapRequests.status, "open")))).map(toSwap);
        const path = findSwapCycle(request, open);
        if (!path) return ok({ request, cycleId: null as string | null });
        const now = new Date();
        const cycle: SwapCycle = {
          id: nid("cyc"), campusId: actor.campusId, course, requestIds: path.map((p) => p.id),
          confirmedBy: path.filter((p) => p.autoAccept).map((p) => p.userId), status: "proposed", swapAt: null, createdAt: now,
        };
        for (const p of path) {
          p.status = "proposed";
          p.cycleId = cycle.id;
        }
        if (cycle.confirmedBy.length) applyConfirm(cycle, cycle.confirmedBy[0], path, now);
        await db.insert(swapCycles).values(cycle);
        for (const p of path) await db.update(swapRequests).set({ status: p.status, cycleId: cycle.id }).where(eq(swapRequests.id, p.id));
        for (const p of path) {
          if (p.userId !== actor.userId) await notify(db, actor.campusId, p.userId, `${path.length}-way swap found for ${course}`, "Open Class swap to confirm the coordinated drop/add.");
        }
        return ok({ request: { ...request, status: path[0].status, cycleId: cycle.id }, cycleId: cycle.id as string | null });
      });
      if (!r.ok) return r;
      const cycle = r.value.cycleId ? toCycle((await http.select().from(swapCycles).where(eq(swapCycles.id, r.value.cycleId)))[0]) : null;
      return ok({ request: r.value.request, cycle: cycle ? await cycleView(http, cycle) : null });
    },

    async confirmCycle(actor, cycleId) {
      const r = await tx(async (db) => {
        const [row] = await db.select().from(swapCycles).where(eq(swapCycles.id, cycleId)).for("update");
        if (!row || row.campusId !== actor.campusId) return fail("not_found", "Swap not found.");
        const c = toCycle(row);
        const reqs = (await db.select().from(swapRequests).where(inArray(swapRequests.id, c.requestIds))).map(toSwap);
        if (!reqs.some((q) => q.userId === actor.userId)) return fail("forbidden", "You're not in this swap.");
        if (c.status !== "proposed") return fail("unavailable", "This swap isn't waiting on confirmations.");
        const matched = applyConfirm(c, actor.userId, reqs, new Date());
        await db.update(swapCycles).set({ confirmedBy: c.confirmedBy, status: c.status, swapAt: c.swapAt }).where(eq(swapCycles.id, c.id));
        if (matched) {
          await db.update(swapRequests).set({ status: "matched" }).where(inArray(swapRequests.id, c.requestIds));
          for (const q of reqs) await notify(db, q.campusId, q.userId, `${c.course} swap is on`, "Everyone confirmed. Check the drop/add plan in Class swap.");
        }
        return ok(c);
      });
      if (!r.ok) return r;
      return ok(await cycleView(http, r.value));
    },

    async cancelSwap(actor, requestId) {
      return tx(async (db) => {
        const [r] = await db.select().from(swapRequests).where(eq(swapRequests.id, requestId)).for("update");
        if (!r || r.userId !== actor.userId) return fail("not_found", "Swap not found.");
        if (r.status === "matched") return fail("conflict", "Everyone already confirmed — coordinate with the group to back out.");
        if (r.cycleId) {
          const [c] = await db.select().from(swapCycles).where(eq(swapCycles.id, r.cycleId));
          if (c) {
            await db.update(swapCycles).set({ status: "cancelled" }).where(eq(swapCycles.id, c.id));
            await db
              .update(swapRequests)
              .set({ status: "open", cycleId: null })
              .where(and(inArray(swapRequests.id, c.requestIds), ne(swapRequests.id, r.id)));
          }
        }
        await db.update(swapRequests).set({ status: "cancelled" }).where(eq(swapRequests.id, r.id));
        return ok(undefined);
      });
    },
  };
}
