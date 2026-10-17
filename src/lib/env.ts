import "server-only";

/**
 * Runtime mode detection. Missing credentials never crash the app — they
 * switch the relevant subsystem into demo behaviour, and the UI says so.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  resendKey: process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? process.env.AUTH_EMAIL_FROM ?? "Dibs <onboarding@resend.dev>",
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  forceMock: process.env.DIBS_FORCE_MOCK === "1",
  /** Allow wiping and reseeding a Neon database from the demo UI. Never set on a real deployment. */
  allowNeonReset: process.env.DIBS_ALLOW_DEMO_RESET === "1",
};

export const dataMode: "neon" | "mock" = env.databaseUrl && !env.forceMock ? "neon" : "mock";

/**
 * How sign-in codes reach the student:
 * - "email": sent with Resend (RESEND_API_KEY). Proves inbox control.
 * - "screen": no email provider configured; the code is shown on screen,
 *   clearly labelled. Useful for demos, NOT proof of identity.
 */
export const emailDelivery: "email" | "screen" = env.resendKey ? "email" : "screen";

export const isDemo = dataMode === "mock" || emailDelivery === "screen";

/** Signs session cookies and code hashes. The dev fallback is fine locally; set AUTH_SECRET in production. */
export const sessionSecret = env.authSecret || "dibs-dev-only-not-a-secret";

export const storageMode: "blob" | "mock" = env.blobToken ? "blob" : "mock";

/** Demo-only controls (reset, end auction now). Always on in mock mode; on Neon only with DIBS_ALLOW_DEMO_RESET=1. */
export const demoToolsEnabled = dataMode === "mock" || env.allowNeonReset;
