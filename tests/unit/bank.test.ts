import { beforeEach, describe, expect, it } from "vitest";
import { resetMockStore, mockStore } from "@/data/adapters/mock";
import { createMockBankRepository } from "@/data/adapters/mock/bank";
import { buildBundle } from "@/features/bank/domain";

const bank = createMockBankRepository();
const demo = { userId: "usr_ua_demo", campusId: "ua" };
const maya = { userId: "usr_ua_maya", campusId: "ua" };

beforeEach(() => resetMockStore(new Date()));

describe("furniture bank", () => {
  it("builds a bundle within budget from available inventory", () => {
    const b = buildBundle(mockStore().bankItems, ["desk", "chair", "lamp", "fridge", "rug"], 20000);
    expect(b.totalCents).toBeLessThanOrEqual(20000);
    expect(new Set(b.items.map((i) => i.category)).size).toBe(b.items.length);
    expect(b.items.length).toBe(5);
  });

  it("reserves all-or-nothing and never double-books", async () => {
    const r1 = await bank.reserve(demo, ["bnk_ua_desk", "bnk_ua_chair"], "2027-01-12");
    expect(r1.ok).toBe(true);
    const r2 = await bank.reserve(maya, ["bnk_ua_lamp", "bnk_ua_desk"], "2027-01-12");
    expect(r2).toMatchObject({ ok: false, code: "unavailable" });
    // The lamp must not be left reserved by the failed attempt.
    expect((await bank.listInventory("ua")).find((i) => i.id === "bnk_ua_lamp")?.status).toBe("available");
  });

  it("concurrent reservations: exactly one wins", async () => {
    const rs = await Promise.all([bank.reserve(demo, ["bnk_ua_sofa"], "2027-01-12"), bank.reserve({ userId: "usr_ua_jordan", campusId: "ua" }, ["bnk_ua_sofa"], "2027-01-12")]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
  });

  it("walks reserved → stored → delivered → returned and recirculates", async () => {
    const before = (await bank.listInventory("ua")).find((i) => i.id === "bnk_ua_rug")!.cycles;
    const r = await bank.reserve(demo, ["bnk_ua_rug"], "2027-01-12");
    if (!r.ok) throw new Error(r.message);
    for (const stage of ["stored", "delivered", "returned"]) {
      const a = await bank.advance(demo, r.value.id);
      expect(a.ok && a.value.stage).toBe(stage);
    }
    const rug = (await bank.listInventory("ua")).find((i) => i.id === "bnk_ua_rug")!;
    expect(rug).toMatchObject({ status: "available", consignorId: demo.userId, cycles: before + 1 });
    expect(rug.history.map((h) => h.kind)).toEqual(expect.arrayContaining(["reserved", "stored", "delivered", "returned"]));
    expect(await bank.advance(demo, r.value.id)).toMatchObject({ ok: false });
  });

  it("blocks own items, other campuses and strangers' reservations", async () => {
    expect(await bank.reserve(maya, ["bnk_ua_fridge"], "2027-01-12")).toMatchObject({ code: "own_listing" });
    expect(await bank.reserve({ userId: "usr_rb_demo", campusId: "riverbend" }, ["bnk_ua_desk2"], "2027-01-12")).toMatchObject({ code: "forbidden" });
    const r = await bank.reserve(demo, ["bnk_ua_desk2"], "2027-01-12");
    if (!r.ok) throw new Error(r.message);
    expect(await bank.advance(maya, r.value.id)).toMatchObject({ code: "not_found" });
  });

  it("deposits get an inventory code and a shelf", async () => {
    const d = await bank.deposit(demo, { title: "Desk fan", category: "lamp", condition: "good", widthCm: 30, depthCm: 30, heightCm: 40, priceCents: 1000, imageUrl: null });
    expect(d.ok && d.value.inventoryCode).toMatch(/^UA-\d{4}$/);
    expect(d.ok && d.value.status).toBe("available");
  });
});
