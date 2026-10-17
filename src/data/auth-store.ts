/** Storage for one-time email codes and user identities. Mock and Neon implement it. */
export type EmailCode = {
  id: string;
  email: string;
  campusId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
};

export interface AuthStore {
  createCode(row: Omit<EmailCode, "id" | "attempts" | "consumedAt" | "createdAt">): Promise<EmailCode>;
  /** Most recent unconsumed code for this email. */
  latestCode(email: string): Promise<EmailCode | null>;
  countCodesSince(email: string, since: Date): Promise<number>;
  bumpAttempts(id: string): Promise<void>;
  /** Marks consumed only if not already consumed. Returns false if someone else used it first. */
  consume(id: string): Promise<boolean>;
  /** Find or create the user + profile for a verified email. */
  ensureUser(input: { email: string; campusId: string; displayName: string; verifiedAt: Date }): Promise<{ id: string; displayName: string }>;
}
