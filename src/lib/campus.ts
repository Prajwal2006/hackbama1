import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCampus, type CampusConfig } from "@/config/campuses";
import { getRepo } from "@/data";
import { getViewer, type Viewer } from "./auth/viewer";

/** Server-side tenant resolution. Unknown slugs 404; mixed case redirects to canonical. */
export function resolveCampus(slug: string): CampusConfig {
  const campus = getCampus(slug);
  if (!campus) notFound();
  if (campus.slug !== slug) redirect(`/${campus.slug}`);
  return campus;
}

export type CampusContext = {
  campus: CampusConfig;
  viewer: Viewer | null;
  /** True when the viewer is verified at *this* campus (may transact). */
  isMember: boolean;
  savedIds: Set<string>;
};

export const loadCampusContext = cache(async (slug: string): Promise<CampusContext> => {
  const campus = resolveCampus(slug);
  const viewer = await getViewer();
  const savedIds = viewer ? new Set(await getRepo().listSavedIds(viewer.actor)) : new Set<string>();
  return { campus, viewer, isMember: viewer?.actor.campusId === campus.slug, savedIds };
});

/** For pages that need a signed-in student; sends anonymous visitors to sign in. */
export async function requireMember(slug: string, next: string) {
  const ctx = await loadCampusContext(slug);
  if (!ctx.viewer) redirect(`/${ctx.campus.slug}/signin?next=${encodeURIComponent(next)}`);
  return ctx as CampusContext & { viewer: Viewer };
}
