/** Client-side image downscale → JPEG data URL. Keeps uploads small for any storage adapter. */
export async function resizeImage(file: File, maxEdge = 1100, maxChars = 360_000): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  const bitmap = await createImageBitmap(file);
  let edge = maxEdge;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", 0.8 - attempt * 0.08);
    if (url.length <= maxChars) {
      bitmap.close();
      return url;
    }
    edge = Math.round(edge * 0.78);
  }
  bitmap.close();
  throw new Error("That photo is too large even after resizing.");
}
