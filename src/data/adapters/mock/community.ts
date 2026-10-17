/**
 * In-memory community repository. Shares the mock store with the marketplace
 * adapter. Every mutation is synchronous after its first line, so concurrent
 * joins can't oversubscribe a post.
 */
import { randomUUID } from "node:crypto";
import { applyConfirm, checkJoin, findSwapCycle } from "@/features/community/domain";
import { formatCents } from "@/lib/money";
import { canTransact } from "@/lib/policy";
import type { CommunityRepository } from "../../community-repository";
import type { CommunityPost, CycleView, PostView, SwapCycle, SwapRequest, SwapView } from "../../community-types";
import { fail, ok } from "../../repository";
import type { NotificationKind } from "../../types";
import { mockStore, type Store } from ".";

const id = (p: string) => `${p}_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
const clone = <T>(v: T): T => structuredClone(v);
const nameOf = (s: Store, uid: string) => s.profiles.find((p) => p.id === uid)?.displayName ?? "Student";

function postView(s: Store, p: CommunityPost): PostView {
  const members = s.members
    .filter((m) => m.postId === p.id && m.status === "joined")
    .map((m) => ({ ...m, userName: nameOf(s, m.userId) }));
  return { ...p, ownerName: nameOf(s, p.ownerId), taken: members.reduce((n, m) => n + m.quantity, 0), members };
}

function notify(s: Store, campusId: string, userId: string, title: string, body: string, kind: NotificationKind = "dibs_confirmed") {
  s.notifications.push({ id: id("ntf"), campusId, userId, kind, title, body, listingId: null, readAt: null, createdAt: new Date() });
}

function swapView(s: Store, r: SwapRequest): SwapView {
  return { ...r, userName: nameOf(s, r.userId) };
}

function cycleView(s: Store, c: SwapCycle): CycleView {
  return { ...c, requests: c.requestIds.map((rid) => swapView(s, s.swaps.find((r) => r.id === rid)!)) };
}

export function createMockCommunityRepository(): CommunityRepository {
  return {
    async listPosts(campusId, kind) {
      const s = mockStore();
      return clone(
        s.posts
          .filter((p) => p.campusId === campusId && p.kind === kind && p.status !== "cancelled")
          .sort((a, b) => (kind === "sub" ? b.createdAt.getTime() - a.createdAt.getTime() : a.startsAt.getTime() - b.startsAt.getTime()))
          .map((p) => postView(s, p)),
      );
    },

    async getPost(postId) {
      const s = mockStore();
      const p = s.posts.find((x) => x.id === postId);
      return p ? clone(postView(s, p)) : null;
    },

    async createPost(actor, input) {
      const s = mockStore();
      const t = new Date();
      const p: CommunityPost = { id: id("pst"), campusId: actor.campusId, ownerId: actor.userId, status: "open", createdAt: t, updatedAt: t, ...input };
      s.posts.push(p);
      return ok(clone(p));
    },

    async joinPost(actor, postId, quantity) {
      const s = mockStore();
      const p = s.posts.find((x) => x.id === postId);
      if (!p) return fail("not_found", "Not found.");
      const members = s.members.filter((m) => m.postId === p.id);
      const check = checkJoin({ post: p, actor, quantity, members, now: new Date() });
      if (!check.ok) return check;
      const t = new Date();
      s.members.push({
        id: id("mem"), postId: p.id, campusId: p.campusId, userId: actor.userId, quantity, status: "joined",
        paymentMethod: null, paymentSentAt: null, paymentReceivedAt: null, createdAt: t, updatedAt: t,
      });
      if (check.value.remaining === 0) p.status = "full";
      notify(s, p.campusId, p.ownerId, `${nameOf(s, actor.userId)} joined`, `${p.title} — ${quantity} × ${p.unitPriceCents ? formatCents(p.unitPriceCents) : "free"}.`);
      return ok(clone(postView(s, p)));
    },

    async leavePost(actor, postId) {
      const s = mockStore();
      const p = s.posts.find((x) => x.id === postId);
      if (!p) return fail("not_found", "Not found.");
      const m = s.members.find((x) => x.postId === postId && x.userId === actor.userId && x.status === "joined");
      if (!m) return fail("not_found", "You're not in this.");
      if (m.paymentReceivedAt) return fail("conflict", "The owner already confirmed your payment — sort it out with them first.");
      m.status = "left";
      m.updatedAt = new Date();
      if (p.status === "full") p.status = "open";
      return ok(clone(postView(s, p)));
    },

    async ackMember(actor, memberId, what, method) {
      const s = mockStore();
      const m = s.members.find((x) => x.id === memberId);
      const p = m && s.posts.find((x) => x.id === m.postId);
      if (!m || !p || p.campusId !== actor.campusId) return fail("not_found", "Not found.");
      if (p.unitPriceCents === 0) return fail("invalid", "It's free — nothing to pay.");
      const t = new Date();
      if (what === "sent") {
        if (m.userId !== actor.userId) return fail("forbidden", "Only the member marks payment sent.");
        m.paymentSentAt = t;
        m.paymentMethod = method ?? m.paymentMethod;
        notify(s, p.campusId, p.ownerId, "Payment sent", `${nameOf(s, m.userId)} sent ${formatCents(p.unitPriceCents * m.quantity)} for ${p.title}${m.paymentMethod ? ` via ${m.paymentMethod}` : ""}.`);
      } else {
        if (p.ownerId !== actor.userId) return fail("forbidden", "Only the organizer confirms payment received.");
        m.paymentReceivedAt = t;
        notify(s, p.campusId, m.userId, "Payment received", `${nameOf(s, p.ownerId)} confirmed your payment for ${p.title}.`);
      }
      m.updatedAt = t;
      return ok(clone(postView(s, p)));
    },

    async closePost(actor, postId) {
      const s = mockStore();
      const p = s.posts.find((x) => x.id === postId);
      if (!p || p.campusId !== actor.campusId) return fail("not_found", "Not found.");
      if (p.ownerId !== actor.userId) return fail("forbidden", "Only the organizer can close this.");
      p.status = "closed";
      p.updatedAt = new Date();
      return ok(clone(postView(s, p)));
    },

    async listSwaps(campusId) {
      const s = mockStore();
      return clone(s.swaps.filter((r) => r.campusId === campusId && r.status !== "cancelled").map((r) => swapView(s, r)));
    },

    async mySwaps(actor) {
      const s = mockStore();
      const requests = s.swaps.filter((r) => r.userId === actor.userId && r.status !== "cancelled");
      const cycleIds = new Set(requests.map((r) => r.cycleId).filter(Boolean));
      return clone({
        requests: requests.map((r) => swapView(s, r)),
        cycles: s.cycles.filter((c) => cycleIds.has(c.id) && c.status !== "cancelled").map((c) => cycleView(s, c)),
      });
    },

    async createSwap(actor, input) {
      const s = mockStore();
      if (!canTransact(actor, actor.campusId)) return fail("forbidden", "Not allowed.");
      const course = input.course.trim().toUpperCase().replace(/\s+/g, " ");
      const have = input.haveSection.trim().toUpperCase();
      const want = input.wantSection.trim().toUpperCase();
      if (!course || !have || !want) return fail("invalid", "Fill in course and both sections.");
      if (have === want) return fail("invalid", "You already have that section.");
      if (s.swaps.some((r) => r.userId === actor.userId && r.course === course && ["open", "proposed", "matched"].includes(r.status))) {
        return fail("duplicate", "You already have an open swap for this course.");
      }
      const t = new Date();
      const request: SwapRequest = {
        id: id("swp"), campusId: actor.campusId, userId: actor.userId, course, haveSection: have, wantSection: want,
        status: "open", cycleId: null, autoAccept: input.autoAccept, createdAt: t,
      };
      s.swaps.push(request);
      const path = findSwapCycle(request, s.swaps.filter((r) => r.campusId === actor.campusId));
      if (!path) return ok(clone({ request, cycle: null }));
      const cycle: SwapCycle = {
        id: id("cyc"), campusId: actor.campusId, course, requestIds: path.map((r) => r.id),
        confirmedBy: path.filter((r) => r.autoAccept).map((r) => r.userId), status: "proposed", swapAt: null, createdAt: t,
      };
      for (const r of path) {
        r.status = "proposed";
        r.cycleId = cycle.id;
      }
      s.cycles.push(cycle);
      if (cycle.confirmedBy.length) applyConfirm(cycle, cycle.confirmedBy[0], path, t);
      for (const r of path) {
        if (r.userId !== actor.userId) notify(s, r.campusId, r.userId, `${path.length}-way swap found for ${course}`, "Open Class swap to confirm the coordinated drop/add.");
      }
      return ok(clone({ request, cycle: cycleView(s, cycle) }));
    },

    async confirmCycle(actor, cycleId) {
      const s = mockStore();
      const c = s.cycles.find((x) => x.id === cycleId);
      if (!c || c.campusId !== actor.campusId) return fail("not_found", "Swap not found.");
      const requests = c.requestIds.map((rid) => s.swaps.find((r) => r.id === rid)!);
      if (!requests.some((r) => r.userId === actor.userId)) return fail("forbidden", "You're not in this swap.");
      if (c.status !== "proposed") return fail("unavailable", "This swap isn't waiting on confirmations.");
      const matched = applyConfirm(c, actor.userId, requests, new Date());
      if (matched) {
        for (const r of requests) notify(s, r.campusId, r.userId, `${c.course} swap is on`, "Everyone confirmed. Check the drop/add plan in Class swap.");
      }
      return ok(clone(cycleView(s, c)));
    },

    async cancelSwap(actor, requestId) {
      const s = mockStore();
      const r = s.swaps.find((x) => x.id === requestId);
      if (!r || r.userId !== actor.userId) return fail("not_found", "Swap not found.");
      if (r.status === "matched") return fail("conflict", "Everyone already confirmed — coordinate with the group to back out.");
      if (r.cycleId) {
        const c = s.cycles.find((x) => x.id === r.cycleId);
        if (c) {
          c.status = "cancelled";
          for (const other of c.requestIds.map((rid) => s.swaps.find((x) => x.id === rid)!)) {
            if (other.id !== r.id) {
              other.status = "open";
              other.cycleId = null;
            }
          }
        }
      }
      r.status = "cancelled";
      return ok(undefined);
    },
  };
}
