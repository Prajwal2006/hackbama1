import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { campusForEmail } from "@/config/campuses";
import { accounts, sessions, users, verificationTokens } from "@/data/schema";
import { getRepo } from "@/data";
import { authMode, env } from "@/lib/env";

/**
 * Auth.js (v5) — production campus-email verification.
 *
 * Flow: magic link via Resend. The campus email domain is checked on the server
 * before the link is sent (`requestMagicLink` action) AND again in the
 * `signIn` callback, so a forged request can't get a link for a foreign domain.
 * Identity is established only once the user clicks the link (proves inbox
 * control); `verifiedAt` is stamped at that moment.
 *
 * Only active when DATABASE_URL, AUTH_SECRET and AUTH_RESEND_KEY are set;
 * otherwise the app uses the mock session in `src/lib/auth/mock-session.ts`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  if (authMode !== "authjs") {
    return { providers: [], secret: env.authSecret || "mock-mode-unused" };
  }
  const db = drizzle({ client: neon(env.databaseUrl) });
  return {
    secret: env.authSecret,
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    session: { strategy: "database" },
    providers: [Resend({ apiKey: env.resendKey, from: env.emailFrom })],
    pages: { signIn: "/signin", verifyRequest: "/signin?sent=1", error: "/signin" },
    callbacks: {
      async signIn({ user }) {
        return !!user.email && !!campusForEmail(user.email);
      },
      async session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
    events: {
      async signIn({ user }) {
        if (!user.id || !user.email) return;
        const campus = campusForEmail(user.email);
        if (!campus) return;
        await getRepo().upsertProfile({
          id: user.id,
          campusId: campus.slug,
          email: user.email,
          displayName: user.name || user.email.split("@")[0],
          verifiedAt: new Date(),
        });
      },
    },
  };
});
