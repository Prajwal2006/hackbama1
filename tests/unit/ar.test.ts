import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { createMockArRepository } from "@/data/adapters/mock/ar";
import { normalizeSpec, specToGlb } from "@/features/ar/build";
import { AR_EXAMPLES } from "@/features/ar/examples";
import { arModelInputSchema } from "@/features/ar/spec";

const box = (o: Record<string, unknown>) => ({ shape: "box", w: 5, d: 5, h: 10, color: "#336699", material: "wood", ...o });

describe("normalizeSpec", () => {
  it("mirrors a leg across x and z into four grounded, equal legs", () => {
    const { parts } = normalizeSpec({ parts: [box({ x: 55, z: 25, y: 2, h: 69, mirror: "xz" })] });
    expect(parts).toHaveLength(4);
    expect(parts.every((p) => p.y === 0)).toBe(true);
    expect(new Set(parts.map((p) => p.y + p.h)).size).toBe(1);
    expect(new Set(parts.map((p) => `${Math.sign(p.x)}${Math.sign(p.z)}`)).size).toBe(4);
  });

  it("lowers a part hovering just above the one below, but leaves overlaps alone", () => {
    const hover = normalizeSpec({ parts: [box({ w: 40, d: 40, h: 5 }), box({ y: 6.5, w: 10, d: 10 })] });
    expect(hover.parts[1].y).toBe(5);
    const overlap = normalizeSpec({ parts: [box({ y: 71, w: 100, d: 50, h: 4 }), box({ x: 20, y: 57.5, w: 30, d: 30, h: 15 })] });
    expect(overlap.parts.find((p) => p.w === 100)?.y).toBe(71);
  });

  it("accepts colors without a leading # and rejects junk", () => {
    const { parts } = normalizeSpec({ parts: [box({ color: "668CB8" }), box({ x: 10, color: "blue" })] });
    expect(parts.map((p) => p.color)).toEqual(["#668cb8", "#999999"]);
  });

  it("fills missing sizes instead of producing invisible parts", () => {
    const { parts } = normalizeSpec({ parts: [{ shape: "cylinder", radiusTop: null, radiusBottom: 5, h: 10 }] });
    expect(parts[0].w).toBeGreaterThan(1);
    expect(parts[0].radiusTop).toBe(5);
  });

  it("is idempotent, so stored specs can be re-normalized", () => {
    const once = normalizeSpec(AR_EXAMPLES.desk);
    expect(normalizeSpec(once)).toEqual(once);
    expect(arModelInputSchema.safeParse({ spec: once, dimensionsCm: AR_EXAMPLES.desk.dimensionsCm }).success).toBe(true);
  });

  it("rejects an empty spec", () => {
    expect(() => normalizeSpec({ parts: [] })).toThrow();
  });
});

describe("specToGlb", () => {
  it("produces a valid GLB at the requested real-world size", async () => {
    const dims = AR_EXAMPLES.chair.dimensionsCm;
    const glb = await specToGlb(normalizeSpec(AR_EXAMPLES.chair), dims);
    const bytes = new Uint8Array(glb);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("glTF");
    expect(bytes.length).toBeLessThan(1_000_000);
    const gltf = await new Promise<{ scene: import("three").Object3D }>((resolve, reject) =>
      new GLTFLoader().parse(glb, "", resolve, reject),
    );
    const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    expect(size.x * 100).toBeCloseTo(dims.w, 0);
    expect(size.y * 100).toBeCloseTo(dims.h, 0);
    expect(size.z * 100).toBeCloseTo(dims.d, 0);
    expect(new Box3().setFromObject(gltf.scene).min.y).toBeCloseTo(0, 3); // stands on the floor
  });
});

describe("mock AR repository", () => {
  it("ships seeded models for demo listings and can save new ones", async () => {
    const repo = createMockArRepository();
    expect((await repo.getByListing("lst_ua_desk"))?.dimensionsCm.w).toBe(120);
    expect(await repo.getByListing("lst_ua_rug")).toBeNull();
    expect([...(await repo.listingsWithModel(["lst_ua_desk", "lst_ua_rug"]))]).toEqual(["lst_ua_desk"]);

    const saved = await repo.save({
      listingId: "lst_ua_rug",
      campusId: "ua",
      sellerId: "usr_ua_ana",
      spec: normalizeSpec({ parts: [box({})] }),
      dimensionsCm: { w: 100, d: 60, h: 2 },
    });
    expect(saved.ok).toBe(true);
    expect((await repo.getByListing("lst_ua_rug"))?.dimensionsCm.h).toBe(2);
    expect(await repo.save({ listingId: "nope", campusId: "ua", sellerId: "x", spec: normalizeSpec({ parts: [box({})] }), dimensionsCm: { w: 10, d: 10, h: 10 } })).toMatchObject({ ok: false });
  });
});
