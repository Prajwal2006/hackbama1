import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { ArRepository } from "../../ar-repository";
import { fail, ok } from "../../repository";
import * as schema from "../../schema";

const { arModels } = schema;

export function createNeonArRepository(databaseUrl: string): ArRepository {
  const db = drizzle({ client: neon(databaseUrl), schema });
  return {
    // AR is an extra on a listing: if its table isn't migrated yet, the listing page must still load.
    async getByListing(listingId) {
      try {
        const [row] = await db.select().from(arModels).where(eq(arModels.listingId, listingId)).limit(1);
        return row ?? null;
      } catch {
        return null;
      }
    },

    async listingsWithModel(listingIds) {
      if (!listingIds.length) return new Set();
      try {
        const rows = await db
          .select({ id: arModels.listingId })
          .from(arModels)
          .where(inArray(arModels.listingId, listingIds));
        return new Set(rows.map((r) => r.id));
      } catch {
        return new Set();
      }
    },

    async save(model) {
      try {
        const [row] = await db
          .insert(arModels)
          .values(model)
          .onConflictDoUpdate({
            target: arModels.listingId,
            set: { spec: model.spec, dimensionsCm: model.dimensionsCm },
          })
          .returning();
        return ok(row);
      } catch {
        return fail("not_found", "Couldn't save the 3D model for that listing.");
      }
    },
  };
}
