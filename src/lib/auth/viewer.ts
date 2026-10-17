import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { campusForEmail } from "@/config/campuses";
import { getRepo } from "@/data";
import type { Actor } from "@/data/repository";
import type { Profile } from "@/data/types";
import { authMode } from "../env";
import { decodeMockSession, MOCK_COOKIE } from "./mock-session";

export type Viewer = {
  actor: Actor;
  profile: Profile;
  /** "simulated" in mock mode — the UI must say so. */
  verification: "verified" | "simulated";
};

/**
 * The trusted server-side identity for this request, or null.
 * Never derived from client-supplied ids; only from a verified session.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const repo = getRepo();
  if (authMode === "authjs") {
    const { auth } = await import("@/auth");
    const session = await auth();
    const userId = session?.user?.id;
    const email = session?.user?.email;
    if (!userId || !email) return null;
    let profile = await repo.getProfile(userId);
    if (!profile) {
      const campus = campusForEmail(email);
      if (!campus) return null;
      profile = await repo.upsertProfile({
        id: userId,
        campusId: campus.slug,
        email,
        displayName: session.user?.name || email.split("@")[0],
        verifiedAt: new Date(),
      });
    }
    return { actor: { userId, campusId: profile.campusId }, profile, verification: "verified" };
  }

  const jar = await cookies();
  const s = decodeMockSession(jar.get(MOCK_COOKIE)?.value);
  if (!s) return null;
  let profile = await repo.getProfile(s.userId);
  // The in-memory store may have been reset; recreate the profile from the signed cookie.
  profile ??= await repo.upsertProfile({
    id: s.userId,
    campusId: s.campusId,
    displayName: s.displayName,
    email: s.email,
    verifiedAt: new Date(s.verifiedAt),
  });
  return { actor: { userId: profile.id, campusId: profile.campusId }, profile, verification: "simulated" };
});

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new UnauthenticatedError();
  return v;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign in with your campus email first.");
  }
}
