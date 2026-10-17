/** Uploads one resized photo (data URL from `resizeImage`) to `/api/photos`, retrying once. Returns its URL. */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  let lastError = "Upload failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) return json.url;
      lastError = json.error ?? `Upload failed (${res.status})`;
      if (res.status >= 400 && res.status < 500) break; // our fault — retrying won't help
    } catch {
      lastError = "Connection dropped while uploading";
    }
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(lastError);
}
