import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepository, resetMockStore } from "@/data/adapters/mock";

const repo = createMockRepository();
const uaBuyer = { userId: "usr_ua_demo", campusId: "ua" };
const uaOther = { userId: "usr_ua_ana", campusId: "ua" };
const rbStudent = { userId: "usr_rb_demo", campusId: "demo" };

beforeEach(() => resetMockStore(new Date()));

describe("dibs", () => {
  it("reserves once; a second claimant loses", async () => {
    const first = await repo.callDibs(uaBuyer, "lst_ua_rug");
    expect(first.ok).toBe(true);
    const second = await repo.callDibs(uaOther, "lst_ua_rug");
    expect(second).toMatchObject({ ok: false, code: "unavailable" });
    expect((await repo.getListing("lst_ua_rug"))?.status).toBe("reserved");
  });

  it("handles simultaneous claims: exactly one wins", async () => {
    const results = await Promise.all([repo.callDibs(uaBuyer, "lst_ua_lamp"), repo.callDibs(uaOther, "lst_ua_lamp")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("expires holds and relists the item", async () => {
    await repo.callDibs(uaBuyer, "lst_ua_rug");
    const report = await repo.runMaintenance(new Date(Date.now() + 25 * 3600e3));
    expect(report.expiredDibs).toBeGreaterThanOrEqual(1);
    expect((await repo.getListing("lst_ua_rug"))?.status).toBe("active");
  });

  it("blocks sellers and other campuses", async () => {
    expect(await repo.callDibs({ userId: "usr_ua_priya", campusId: "ua" }, "lst_ua_rug")).toMatchObject({ code: "own_listing" });
    expect(await repo.callDibs(rbStudent, "lst_ua_rug")).toMatchObject({ code: "forbidden" });
  });
});

describe("bids", () => {
  it("enforces increments, updates statuses and notifies the outbid user", async () => {
    const low = await repo.placeBid(uaOther, { listingId: "lst_ua_tv_tcl", amountCents: 11600, idempotencyKey: "k-low-123" });
    expect(low).toMatchObject({ ok: false, code: "bid_too_low" });
    const okBid = await repo.placeBid(uaBuyer, { listingId: "lst_ua_tv_tcl", amountCents: 12500, idempotencyKey: "k-ok-1234" });
    expect(okBid.ok).toBe(true);
    const bids = await repo.listBidsForListing("lst_ua_tv_tcl");
    expect(bids[0]).toMatchObject({ amountCents: 12500, status: "active" });
    expect(bids.filter((b) => b.status === "active")).toHaveLength(1);
    const anaNotes = await repo.listNotifications({ userId: "usr_ua_ana", campusId: "ua" });
    expect(anaNotes[0]).toMatchObject({ kind: "outbid" });
  });

  it("is idempotent for resubmits", async () => {
    const a = await repo.placeBid(uaBuyer, { listingId: "lst_ua_tv_tcl", amountCents: 12500, idempotencyKey: "same-key-1" });
    const b = await repo.placeBid(uaBuyer, { listingId: "lst_ua_tv_tcl", amountCents: 12500, idempotencyKey: "same-key-1" });
    expect(a.ok && b.ok && a.value.bid.id === b.value.bid.id).toBe(true);
  });

  it("reports a conflict when another bid lands first", async () => {
    const [r1, r2] = await Promise.all([
      repo.placeBid(uaBuyer, { listingId: "lst_ua_tv_tcl", amountCents: 12500, idempotencyKey: "race-a-1", expectedMinCents: 12500 }),
      repo.placeBid(uaOther, { listingId: "lst_ua_tv_tcl", amountCents: 12500, idempotencyKey: "race-b-1", expectedMinCents: 12500 }),
    ]);
    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
    expect([r1, r2].find((r) => !r.ok)).toMatchObject({ code: "conflict" });
  });

  it("rejects seller self-bids and cross-campus bidders", async () => {
    expect(await repo.placeBid({ userId: "usr_ua_jordan", campusId: "ua" }, { listingId: "lst_ua_tv_tcl", amountCents: 20000, idempotencyKey: "self-bid-1" })).toMatchObject({ code: "own_listing" });
    expect(await repo.placeBid(rbStudent, { listingId: "lst_ua_tv_tcl", amountCents: 20000, idempotencyKey: "xcampus-1" })).toMatchObject({ code: "forbidden" });
  });

  it("settles once, idempotently", async () => {
    const later = new Date(Date.now() + 40 * 3600e3);
    const first = await repo.runMaintenance(later);
    const second = await repo.runMaintenance(later);
    expect(first.settledAuctions).toBeGreaterThan(0);
    expect(second.settledAuctions).toBe(0);
    const tv = await repo.getListing("lst_ua_tv_tcl");
    expect(tv?.status).toBe("sold");
    expect(tv?.auction?.outcome).toBe("won");
  });

  it("buy-now closes the auction and blocks further bids", async () => {
    const r = await repo.buyNow(uaBuyer, "lst_ua_tv_tcl");
    expect(r.ok).toBe(true);
    expect(await repo.placeBid(uaOther, { listingId: "lst_ua_tv_tcl", amountCents: 30000, idempotencyKey: "after-bn-1" })).toMatchObject({ ok: false });
    expect(await repo.buyNow(uaOther, "lst_ua_tv_tcl")).toMatchObject({ ok: false });
  });
});

describe("listing ownership", () => {
  it("only the seller can change a listing, and only on its campus", async () => {
    expect(await repo.setListingStatus(uaBuyer, "lst_ua_rug", "cancelled")).toMatchObject({ code: "forbidden" });
    expect(await repo.setListingStatus({ userId: "usr_ua_priya", campusId: "demo" }, "lst_ua_rug", "cancelled")).toMatchObject({ code: "not_found" });
    expect((await repo.setListingStatus({ userId: "usr_ua_priya", campusId: "ua" }, "lst_ua_rug", "cancelled")).ok).toBe(true);
  });
  it("auctions with bids can't be cancelled", async () => {
    expect(await repo.setListingStatus({ userId: "usr_ua_jordan", campusId: "ua" }, "lst_ua_tv_tcl", "cancelled")).toMatchObject({ code: "conflict" });
  });
  it("private records stay private", async () => {
    const notes = await repo.listNotifications(rbStudent);
    expect(notes.every((n) => n.userId === rbStudent.userId)).toBe(true);
    const dibs = await repo.listDibsForUser(rbStudent);
    expect(dibs.every((d) => d.buyerId === rbStudent.userId)).toBe(true);
  });
});
