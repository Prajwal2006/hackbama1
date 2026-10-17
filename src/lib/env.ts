import "server-only";

/**
 * Runtime mode detection. Missing credentials never crash the app — they
 * switch the relevant subsystem into mock mode.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  resendKey: process.env.AUTH_RESEND_KEY ?? "",
  emailFrom: process.env.AUTH_EMAIL_FROM ?? "Dibs <onboarding@resend.dev>",
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  forceMock: process.env.DIBS_FORCE_MOCK === "1",
};

export const dataMode: "neon" | "mock" = env.databaseUrl && !env.forceMock ? "neon" : "mock";

/** Real campus-email auth needs a database (for tokens), a secret, and an email sender. */
export const authMode: "authjs" | "mock" =
  dataMode === "neon" && env.authSecret && env.resendKey ? "authjs" : "mock";

export const storageMode: "blob" | "mock" = env.blobToken ? "blob" : "mock";

export const isDemo = authMode === "mock" || dataMode === "mock";

/** Secret used to sign mock sessions. A fixed dev fallback is fine: mock identities carry no privilege. */
export const sessionSecret = env.authSecret || "dibs-dev-only-not-a-secret";
