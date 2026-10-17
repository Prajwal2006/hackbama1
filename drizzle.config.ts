import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/data/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Use the direct (unpooled) URL for migrations if you have one.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
  strict: true,
});
