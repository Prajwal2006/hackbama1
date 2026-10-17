"use server";

import { withViewer, type ActionResult } from "@/lib/actions";
import { analyzePhotos, GeminiError, type ArAnalysis } from "./gemini";

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = 400_000; // matches the listing form's resized photos

// Per-user limiter (best effort: each serverless instance keeps its own). Protects the Gemini quota.
const recent = new Map<string, number[]>();
function tooMany(userId: string) {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(userId, hits);
  return hits.length > 6;
}

/**
 * Seller step: turn listing photos into a 3D model description (name, size, parts).
 * Nothing is saved yet; the sell form previews it and sends it back with the listing.
 */
export async function analyzeArPhotosAction(campus: string, imageUrls: string[]): Promise<ActionResult<ArAnalysis>> {
  if (!Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > 4) {
    return { ok: false, code: "invalid", message: "Add 1 to 4 photos first." };
  }
  if (!imageUrls.every((u) => typeof u === "string" && u.length <= MAX_IMAGE_CHARS && DATA_URL.test(u))) {
    return { ok: false, code: "invalid", message: "Those photos couldn't be read. Try adding them again." };
  }
  return withViewer(campus, async (v) => {
    if (v.actor.campusId !== campus) {
      return { ok: false, code: "forbidden", message: "You can only list items at the campus you're verified at." };
    }
    if (tooMany(v.actor.userId)) {
      return { ok: false, code: "unavailable", message: "Slow down a little. Try again in a minute." };
    }
    try {
      return { ok: true, data: await analyzePhotos(imageUrls) };
    } catch (e) {
      const message = e instanceof GeminiError ? e.message : "The 3D scan failed. Please try again.";
      return { ok: false, code: e instanceof GeminiError && e.code === "rate_limited" ? "unavailable" : "invalid", message };
    }
  });
}
