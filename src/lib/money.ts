/**
 * Money helpers. Values are always integer cents; parsing never goes through
 * floating-point multiplication.
 */

const MAX_CENTS = 10_000_00; // $10,000 ceiling for a student marketplace

export function parseDollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().replace(/^\$/, "").replace(/,/g, "");
  if (s === "") return null;
  const m = /^(\d{1,7})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  const whole = Number.parseInt(m[1], 10);
  const frac = (m[2] ?? "").padEnd(2, "0");
  const cents = whole * 100 + Number.parseInt(frac || "0", 10);
  return cents <= MAX_CENTS ? cents : null;
}

export function formatCents(cents: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isInteger(cents)) throw new Error("formatCents expects integer cents");
  const whole = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100);
  const wholeStr = whole.toLocaleString("en-US");
  if (opts.compact && frac === 0) return `$${wholeStr}`;
  return `$${wholeStr}.${String(frac).padStart(2, "0")}`;
}

export function centsToInputString(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const frac = cents % 100;
  return frac === 0 ? String(cents / 100) : `${Math.trunc(cents / 100)}.${String(frac).padStart(2, "0")}`;
}

export { MAX_CENTS };
