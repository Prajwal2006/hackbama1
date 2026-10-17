import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read Next's .env.local on its own.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./src/data/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Use the direct (unpooled) URL for migrations if you have one.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
  strict: true,
});
