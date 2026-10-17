import { CAMPUSES, getCampus } from "@/config/campuses";
import type { Actor } from "@/data/repository";

/**
 * Cross-campus policy. Tenant boundaries are crossed only where a campus has
 * explicitly opted in via `crossCampus` in `src/config/campuses.ts`.
 */

/** Can a viewer (possibly anonymous) see listings owned by `listingCampusId`? */
export function canViewCampus(viewerCampusId: string | null, listingCampusId: string, browsingCampusId: string) {
  // Anyone may browse the public listings of the campus whose URL they are on.
  if (listingCampusId === browsingCampusId) return true;
  const owner = getCampus(listingCampusId);
  if (!owner) return false;
  // Cross-campus discovery requires a verified identity from an allowed campus.
  return viewerCampusId !== null && (owner.crossCampus.discoverableBy as readonly string[]).includes(viewerCampusId);
}

/** Can `actor` claim / bid on a listing owned by `listingCampusId`? */
export function canTransact(actor: Actor, listingCampusId: string) {
  if (actor.campusId === listingCampusId) return true;
  const owner = getCampus(listingCampusId);
  return !!owner && (owner.crossCampus.transactableBy as readonly string[]).includes(actor.campusId);
}

/**
 * Campus ids whose listings appear when browsing `browsingCampusId`.
 * Nearby campuses are included only if the viewer asked and each one allows it.
 */
export function visibleCampusIds(opts: {
  browsingCampusId: string;
  viewerCampusId: string | null;
  includeNearby: boolean;
}): string[] {
  const ids = [opts.browsingCampusId];
  if (!opts.includeNearby || !opts.viewerCampusId) return ids;
  // A viewer browsing their home campus may pull in partner campuses that list them.
  if (opts.viewerCampusId !== opts.browsingCampusId) return ids;
  for (const slug of partnerCampusIds(opts.viewerCampusId)) ids.push(slug);
  return ids;
}

/** Campuses that have opted in to being discovered by `campusId`'s students. */
export function partnerCampusIds(campusId: string): string[] {
  return CAMPUSES.filter(
    (c) => c.slug !== campusId && (c.crossCampus.discoverableBy as readonly string[]).includes(campusId),
  ).map((c) => c.slug);
}
