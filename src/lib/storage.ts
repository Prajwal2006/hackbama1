import "server-only";
import { randomUUID } from "node:crypto";
import { env, storageMode } from "./env";

/**
 * Listing photo storage. Postgres listings only ever store short URLs.
 *
 * - blob: Vercel Blob (`BLOB_READ_WRITE_TOKEN`) — public CDN URLs. Recommended in production.
 * - db:   no object storage configured — each photo gets its own row in the `photos`
 *         table (Neon) or the in-memory store (mock), served from `/api/photos/<id>`.
 *
 * Photos are uploaded one at a time from the browser (`POST /api/photos`) so no
 * request ever carries several images at once.
 */
export const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMime = (typeof PHOTO_MIME)[number];
export const MAX_PHOTO_BYTES = 1_500_000;

export interface StorageAdapter {
  readonly kind: "blob" | "db";
  putPhoto(bytes: Buffer, mime: PhotoMime, opts: { campusId: string; userId: string }): Promise<string>;
  /** Legacy path: a data URL produced by the client resizer. */
  putListingImage(dataUrl: string, opts: { campusId: string; userId: string }): Promise<string>;
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

function fromDataUrl(dataUrl: string): { bytes: Buffer; mime: PhotoMime } {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new Error("Unsupported image");
  return { bytes: Buffer.from(m[2], "base64"), mime: m[1] as PhotoMime };
}

const blobStorage: StorageAdapter = {
  kind: "blob",
  async putPhoto(bytes, mime, { campusId, userId }) {
    const { put } = await import("@vercel/blob");
    const ext = mime === "image/jpeg" ? "jpg" : mime.slice(6);
    const res = await put(`listings/${campusId}/${userId}/${randomUUID()}.${ext}`, bytes, { access: "public", contentType: mime, token: env.blobToken });
    return res.url;
  },
  async putListingImage(dataUrl, opts) {
    const { bytes, mime } = fromDataUrl(dataUrl);
    return this.putPhoto(bytes, mime, opts);
  },
};

const dbStorage: StorageAdapter = {
  kind: "db",
  async putPhoto(bytes, mime, { campusId, userId }) {
    const { getPhotoStore } = await import("@/data");
    const id = randomUUID().replace(/-/g, "");
    await getPhotoStore().put({ id, campusId, ownerId: userId, mime, bytes });
    return `/api/photos/${id}`;
  },
  async putListingImage(dataUrl, opts) {
    const { bytes, mime } = fromDataUrl(dataUrl);
    return this.putPhoto(bytes, mime, opts);
  },
};

export function getStorage(): StorageAdapter {
  return storageMode === "blob" ? blobStorage : dbStorage;
}

/** URLs a listing may reference: our photo route, seeded static photos, or our Blob store. */
export function isAllowedPhotoUrl(url: string) {
  if (/^\/api\/photos\/[a-f0-9]{32}$/.test(url) || /^\/photos\/[\w-]+\.jpg$/.test(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
