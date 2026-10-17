import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type StoredPhoto = { id: string; campusId: string; ownerId: string; mime: string; bytes: Buffer };

export interface PhotoStore {
  put(p: StoredPhoto): Promise<void>;
  get(id: string): Promise<StoredPhoto | null>;
}

const g = globalThis as unknown as { __dibsPhotos?: Map<string, StoredPhoto> };

export function createMockPhotoStore(): PhotoStore {
  const map = () => (g.__dibsPhotos ??= new Map());
  return {
    async put(p) {
      map().set(p.id, p);
    },
    async get(id) {
      return map().get(id) ?? null;
    },
  };
}

export function createNeonPhotoStore(databaseUrl: string): PhotoStore {
  const db = drizzle({ client: neon(databaseUrl), schema });
  return {
    async put(p) {
      await db.insert(schema.photos).values(p);
    },
    async get(id) {
      const [row] = await db.select().from(schema.photos).where(eq(schema.photos.id, id));
      return row ?? null;
    },
  };
}
