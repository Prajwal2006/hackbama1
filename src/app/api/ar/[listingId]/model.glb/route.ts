import { NextResponse } from "next/server";
import { getAr } from "@/data";
import { specToGlb } from "@/features/ar/build";

// Generating a GLB takes well under a second, but give cold starts room.
export const maxDuration = 30;

/**
 * Public on purpose: Android Scene Viewer and iOS Quick Look fetch the model from this URL
 * without the visitor's cookies. It only exposes the shape of an item that is already listed.
 * Listing ids are random, and the file is generated from a small stored spec (nothing is written to disk).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/ar/[listingId]/model.glb">) {
  const { listingId } = await ctx.params;
  const model = await getAr().getByListing(listingId);
  if (!model) return NextResponse.json({ error: "No 3D model for this listing" }, { status: 404 });
  const glb = await specToGlb(model.spec, model.dimensionsCm, listingId);
  return new NextResponse(glb, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
