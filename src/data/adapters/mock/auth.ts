import { createHash, randomUUID } from "node:crypto";
import type { AuthStore, EmailCode } from "../../auth-store";
import { createMockRepository } from ".";

const g = globalThis as unknown as { __dibsCodes?: EmailCode[] };
const codes = () => (g.__dibsCodes ??= []);

export function resetMockCodes() {
  g.__dibsCodes = [];
}

export const userIdForEmail = (email: string) =>
  `usr_${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16)}`;

export function createMockAuthStore(): AuthStore {
  const repo = createMockRepository();
  return {
    async createCode(row) {
      const c: EmailCode = { ...row, id: randomUUID(), attempts: 0, consumedAt: null, createdAt: new Date() };
      codes().push(c);
      return { ...c };
    },
    async latestCode(email) {
      const list = codes().filter((c) => c.email === email && !c.consumedAt);
      const c = list[list.length - 1];
      return c ? { ...c } : null;
    },
    async countCodesSince(email, since) {
      return codes().filter((c) => c.email === email && c.createdAt >= since).length;
    },
    async bumpAttempts(id) {
      const c = codes().find((x) => x.id === id);
      if (c) c.attempts++;
    },
    async consume(id) {
      const c = codes().find((x) => x.id === id);
      if (!c || c.consumedAt) return false;
      c.consumedAt = new Date();
      return true;
    },
    async ensureUser({ email, campusId, displayName, verifiedAt }) {
      const id = userIdForEmail(email);
      const existing = await repo.getProfile(id);
      const p = await repo.upsertProfile({ id, campusId, email, displayName: existing?.displayName ?? displayName, verifiedAt });
      return { id: p.id, displayName: p.displayName };
    },
  };
}
