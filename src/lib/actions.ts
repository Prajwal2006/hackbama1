import "server-only";
import { revalidatePath } from "next/cache";
import { getCampus } from "@/config/campuses";
import type { ErrorCode, Result } from "@/data/repository";
import { getViewer, type Viewer } from "./auth/viewer";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };

export function toAction<T, U = T>(r: Result<T>, map?: (v: T) => U): ActionResult<U> {
  return r.ok ? { ok: true, data: (map ? map(r.value) : r.value) as U } : { ok: false, code: r.code, message: r.message };
}

/**
 * Wraps a mutation: resolves the trusted viewer, rejects anonymous calls, and
 * revalidates the campus tree afterwards. `campusSlug` is only used for cache
 * invalidation — authorization always uses the viewer's verified campus.
 */
export async function withViewer<T>(
  campusSlug: string,
  fn: (viewer: Viewer) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const campus = getCampus(campusSlug);
  if (!campus) return { ok: false, code: "not_found", message: "Unknown campus." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, code: "unauthenticated", message: "Sign in with your campus email to do that." };
  const res = await fn(viewer);
  revalidatePath(`/${campus.slug}`, "layout");
  return res;
}
