import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getRepo } from "@/data";
import type { Actor } from "@/data/repository";
import type { Profile } from "@/data/types";
import { decodeSession, SESSION_COOKIE } from "./session";

export type Viewer = {
  actor: Actor;
  profile: Profile;
  /** "verified" only when a code was delivered by email. The UI labels everything else. */
  verification: "verified" | "simulated";
};

/**
 * The trusted server-side identity for this request, or null.
 * Never derived from client-supplied ids; only from a signed session cookie.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const s = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const repo = getRepo();
  let profile = await repo.getProfile(s.userId);
  // The in-memory store may have been reset; recreate the profile from the signed cookie.
  profile ??= await repo.upsertProfile({
    id: s.userId,
    campusId: s.campusId,
    displayName: s.displayName,
    email: s.email,
    verifiedAt: new Date(s.verifiedAt),
  });
  return {
    actor: { userId: profile.id, campusId: profile.campusId },
    profile,
    verification: s.method === "email" ? "verified" : "simulated",
  };
});
