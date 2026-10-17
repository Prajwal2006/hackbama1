import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository, resetMockStore } from "@/data/adapters/mock";
import { createMockCommunityRepository } from "@/data/adapters/mock/community";
import type { SwapRequest } from "@/data/community-types";
import { checkSchedule, findSwapCycle } from "@/features/community/domain";

const market = createMockRepository();
const community = createMockCommunityRepository();
const demo = { userId: "usr_ua_demo", campusId: "ua" };
const maya = { userId: "usr_ua_maya", campusId: "ua" };
const rb = { userId: "usr_rb_demo", campusId: "riverbend" };

beforeEach(() => resetMockStore(new Date()));

const req = (id: string, userId: string, have: string, want: string): SwapRequest => ({
  id, campusId: "ua", userId, course: "CS 201", haveSection: have, wantSection: want, status: "open", cycleId: null, autoAccept: false, createdAt: new Date(),
});

describe("swap cycles", () => {
  it("finds a 2-way swap", () => {
    const me = req("a", "u1", "001", "002");
    expect(findSwapCycle(me, [me, req("b", "u2", "002", "001")])?.map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("finds the x→y→z loop nobody can do pairwise", () => {
    const me = req("a", "u1", "002", "001");
    const pool = [me, req("b", "u2", "001", "003"), req("c", "u3", "003", "002")];
    const cycle = findSwapCycle(me, pool)!;
    expect(cycle.map((r) => r.id)).toEqual(["a", "c", "b"]);
    // Each person gives their section to the next one, who wants it.
    cycle.forEach((r, i) => expect(cycle[(i + 1) % cycle.length].wantSection).toBe(r.haveSection));
  });
  it("prefers the shortest loop and ignores your own other requests", () => {
    const me = req("a", "u1", "001", "002");
    const pool = [me, req("b", "u2", "002", "001"), req("c", "u3", "001", "004"), req("d", "u1", "002", "001")];
    expect(findSwapCycle(me, pool)?.length).toBe(2);
  });
  it("returns null when no loop exists", () => {
    const me = req("a", "u1", "001", "002");
    expect(findSwapCycle(me, [me, req("b", "u2", "003", "001")])).toBeNull();
  });
});

describe("class swap repository", () => {
  it("completes the seeded CS 201 loop and locks it when everyone confirms", async () => {
    const r = await community.createSwap(demo, { course: "cs 201", haveSection: "002", wantSection: "001", autoAccept: false });
    expect(r.ok && r.value.cycle?.requests.length).toBe(3);
    if (!r.ok || !r.value.cycle) return;
    expect(r.value.cycle.status).toBe("proposed"); // Maya + Jordan auto-accepted; waiting on demo
    const c = await community.confirmCycle(demo, r.value.cycle.id);
    expect(c.ok && c.value.status).toBe("matched");
    expect(c.ok && c.value.swapAt).toBeTruthy();
  });
  it("blocks outsiders from confirming", async () => {
    const r = await community.createSwap(demo, { course: "CS 201", haveSection: "002", wantSection: "001", autoAccept: false });
    if (!r.ok || !r.value.cycle) throw new Error("expected cycle");
    expect(await community.confirmCycle({ userId: "usr_ua_cole", campusId: "ua" }, r.value.cycle.id)).toMatchObject({ code: "forbidden" });
  });
});

describe("community posts", () => {
  it("never oversells seats under concurrent joins", async () => {
    // BHM ride has 2 seats.
    const joins = await Promise.all(
      ["usr_ua_demo", "usr_ua_maya", "usr_ua_ana", "usr_ua_cole"].map((u) => community.joinPost({ userId: u, campusId: "ua" }, "pst_ride_bhm", 1)),
    );
    expect(joins.filter((j) => j.ok)).toHaveLength(2);
    expect((await community.getPost("pst_ride_bhm"))?.status).toBe("full");
  });
  it("enforces payment acknowledgement roles", async () => {
    const j = await community.joinPost(demo, "pst_sub_youtube", 1);
    if (!j.ok) throw new Error(j.message);
    const mine = j.value.members.find((m) => m.userId === demo.userId)!;
    expect(await community.ackMember(demo, mine.id, "received", null)).toMatchObject({ code: "forbidden" });
    expect((await community.ackMember(demo, mine.id, "sent", "Venmo")).ok).toBe(true);
    expect((await community.ackMember({ userId: "usr_ua_ana", campusId: "ua" }, mine.id, "received", null)).ok).toBe(true);
    expect((await community.leavePost(demo, "pst_sub_youtube"))).toMatchObject({ code: "conflict" });
  });
  it("keeps campuses apart", async () => {
    expect(await community.joinPost(rb, "pst_meal_curry", 1)).toMatchObject({ code: "forbidden" });
    expect(await community.joinPost(maya, "pst_meal_bread", 1)).toMatchObject({ code: "own_listing" });
  });
});

describe("handoffs", () => {
  it("dibs creates a handoff; completion needs payment confirmed", async () => {
    const d = await market.callDibs(demo, "lst_ua_rug");
    expect(d.ok).toBe(true);
    const h = (await market.listHandoffs(demo)).find((x) => x.listingId === "lst_ua_rug")!;
    expect(h).toMatchObject({ role: "buyer", amountCents: 3500, status: "pending" });
    const seller = { userId: "usr_ua_priya", campusId: "ua" };
    expect(await market.completeHandoff(seller, h.id)).toMatchObject({ code: "conflict" });
    expect(await market.ackHandoff(seller, h.id, "sent", "Venmo")).toMatchObject({ code: "forbidden" });
    expect((await market.ackHandoff(demo, h.id, "sent", "Zelle")).ok).toBe(true);
    expect((await market.ackHandoff(seller, h.id, "received", null)).ok).toBe(true);
    expect((await market.completeHandoff(seller, h.id)).ok).toBe(true);
    expect((await market.getListing("lst_ua_rug"))?.status).toBe("sold");
  });
  it("auction wins create handoffs", async () => {
    await market.runMaintenance(new Date(Date.now() + 40 * 3600e3));
    const tvWinner = (await market.listBidsForListing("lst_ua_tv_tcl")).find((b) => b.status === "winning")!;
    const hs = await market.listHandoffs({ userId: tvWinner.bidderId, campusId: "ua" });
    expect(hs.some((h) => h.listingId === "lst_ua_tv_tcl" && h.source === "auction")).toBe(true);
  });
  it("move-in pickups need a seller who can hold the item", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    const at = new Date("2027-01-12T20:00:00Z");
    expect(checkSchedule({ phase: "move_in", at, now, moveInDate: "2027-01-12", holdForMoveIn: false }).ok).toBe(false);
    expect(checkSchedule({ phase: "move_in", at, now, moveInDate: "2027-01-12", holdForMoveIn: true }).ok).toBe(true);
    expect(checkSchedule({ phase: "move_out", at: new Date("2026-10-16T00:00:00Z"), now, moveInDate: "2027-01-12", holdForMoveIn: true }).ok).toBe(false);
  });
  it("scheduling extends the dibs hold past the pickup", async () => {
    await market.callDibs(demo, "lst_ua_shelf");
    const h = (await market.listHandoffs(demo)).find((x) => x.listingId === "lst_ua_shelf")!;
    const at = new Date(Date.now() + 3 * 86_400_000);
    expect((await market.scheduleHandoff(demo, h.id, "move_out", at)).ok).toBe(true);
    await market.runMaintenance(new Date(Date.now() + 30 * 3600e3));
    expect((await market.getListing("lst_ua_shelf"))?.status).toBe("reserved");
  });
});
