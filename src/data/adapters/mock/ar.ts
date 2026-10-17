/** In-memory AR models, seeded for a few demo listings. Lives on globalThis so dev reloads keep it. */
import { normalizeSpec } from "@/features/ar/build";
import { AR_EXAMPLES, AR_SEEDED_LISTINGS } from "@/features/ar/examples";
import type { ArModel, ArRepository } from "../../ar-repository";
import { fail, ok } from "../../repository";
import { mockStore } from ".";

const g = globalThis as unknown as { __dibsArModels?: Map<string, ArModel> };

function models(): Map<string, ArModel> {
  if (!g.__dibsArModels) {
    const m = new Map<string, ArModel>();
    for (const l of mockStore().listings) {
      const key = AR_SEEDED_LISTINGS[l.id];
      if (!key) continue;
      const ex = AR_EXAMPLES[key];
      m.set(l.id, {
        listingId: l.id,
        campusId: l.campusId,
        sellerId: l.sellerId,
        spec: normalizeSpec(ex),
        dimensionsCm: ex.dimensionsCm,
        createdAt: l.createdAt,
      });
    }
    g.__dibsArModels = m;
  }
  return g.__dibsArModels;
}

export function createMockArRepository(): ArRepository {
  return {
    async getByListing(listingId) {
      const m = models().get(listingId);
      return m ? structuredClone(m) : null;
    },
    async listingsWithModel(listingIds) {
      const m = models();
      return new Set(listingIds.filter((id) => m.has(id)));
    },
    async save(model) {
      if (!mockStore().listings.some((l) => l.id === model.listingId)) return fail("not_found", "Listing not found.");
      const saved: ArModel = { ...structuredClone(model), createdAt: new Date() };
      models().set(model.listingId, saved);
      return ok(structuredClone(saved));
    },
  };
}
