import "server-only";
import { env, storageMode } from "./env";

/**
 * Listing image storage. Postgres only ever stores URLs.
 *
 * - mock: the browser resizes the image to a small JPEG data URL; we keep it as-is
 *   (bounded to ~350 KB by the listing schema). Nothing leaves the server process.
 * - blob: Vercel Blob (`BLOB_READ_WRITE_TOKEN`), public CDN URLs.
 */
export interface StorageAdapter {
  readonly kind: "mock" | "blob";
  /** Accepts a data URL produced by the client resizer and returns a durable URL. */
  putListingImage(dataUrl: string, opts: { campusId: string; userId: string }): Promise<string>;
}

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

const mockStorage: StorageAdapter = {
  kind: "mock",
  async putListingImage(dataUrl) {
    if (!DATA_URL.test(dataUrl)) throw new Error("Unsupported image");
    return dataUrl;
  },
};

const blobStorage: StorageAdapter = {
  kind: "blob",
  async putListingImage(dataUrl, { campusId, userId }) {
    const m = DATA_URL.exec(dataUrl);
    if (!m) throw new Error("Unsupported image");
    const { put } = await import("@vercel/blob");
    const bytes = Buffer.from(m[2], "base64");
    const res = await put(`listings/${campusId}/${userId}/${crypto.randomUUID()}.${m[1] === "jpeg" ? "jpg" : m[1]}`, bytes, {
      access: "public",
      contentType: `image/${m[1]}`,
      token: env.blobToken,
    });
    return res.url;
  },
};

export function getStorage(): StorageAdapter {
  return storageMode === "blob" ? blobStorage : mockStorage;
}
