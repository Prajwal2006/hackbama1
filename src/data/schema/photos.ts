/**
 * Listing photos when no object storage (Vercel Blob) is configured. Each photo is a
 * small, client-resized JPEG (~100–300 KB) in its own row — listings only keep the URL.
 */
import { customType, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { campuses, profiles } from "./core";

const bytea = customType<{ data: Buffer; driverData: Buffer | string }>({
  dataType: () => "bytea",
  // neon-http returns bytea as a "\x…" hex string; the WebSocket driver returns a Buffer.
  fromDriver: (v) => (typeof v === "string" ? Buffer.from(v.startsWith("\\x") ? v.slice(2) : v, "hex") : Buffer.from(v)),
  toDriver: (v) => v,
});

export const photos = pgTable(
  "photos",
  {
    id: text("id").primaryKey(),
    campusId: text("campus_id").notNull().references(() => campuses.id),
    ownerId: text("owner_id").notNull().references(() => profiles.id),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("photos_owner_idx").on(t.ownerId)],
);
