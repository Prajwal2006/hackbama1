import { getPhotoStore } from "@/data";

/** Serves a stored listing photo. Ids are unguessable and photos are public like the listings they belong to. */
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });
  const photo = await getPhotoStore().get(id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.bytes.length),
      // Photos never change once uploaded: let the browser and Vercel's CDN keep them.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
