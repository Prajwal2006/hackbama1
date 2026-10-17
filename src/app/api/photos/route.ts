import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { getStorage, MAX_PHOTO_BYTES, PHOTO_MIME, type PhotoMime } from "@/lib/storage";

/**
 * Upload ONE listing photo (raw JPEG/PNG/WebP body, already resized in the browser).
 * Returns `{ url }`. Signed-in students only.
 */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in with your campus email first." }, { status: 401 });
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim() as PhotoMime;
  if (!PHOTO_MIME.includes(mime)) return NextResponse.json({ error: "Photos must be JPEG, PNG or WebP." }, { status: 415 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (!bytes.length) return NextResponse.json({ error: "Empty photo." }, { status: 400 });
  if (bytes.length > MAX_PHOTO_BYTES) return NextResponse.json({ error: "That photo is too large." }, { status: 413 });
  // Light magic-number check so random files can't be stored as images.
  const ok =
    (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (mime === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50) ||
    (mime === "image/webp" && bytes.subarray(8, 12).toString() === "WEBP");
  if (!ok) return NextResponse.json({ error: "That file isn't a valid image." }, { status: 415 });
  try {
    const url = await getStorage().putPhoto(bytes, mime, { campusId: viewer.actor.campusId, userId: viewer.actor.userId });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[dibs] photo upload failed", e);
    return NextResponse.json({ error: "Couldn't save that photo. Try again." }, { status: 500 });
  }
}
