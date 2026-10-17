export function relativeTime(date: Date, now = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60_000, "second"],
    [3_600_000, "minute"],
    [86_400_000, "hour"],
    [604_800_000, "day"],
    [Infinity, "week"],
  ];
  const div: Record<string, number> = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 };
  const unit = units.find(([limit]) => abs < limit)![1];
  return new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" }).format(Math.round(diff / div[unit]), unit);
}

/** "2d 4h", "3h 12m", "4m 09s" */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export function formatInZone(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(date);
}

/** Whole days from `now` until a campus-local ISO date (YYYY-MM-DD). */
export function daysUntil(isoDate: string, now = new Date()) {
  const target = new Date(`${isoDate}T12:00:00Z`).getTime();
  return Math.ceil((target - now.getTime()) / 86_400_000);
}

/** Offset (minutes) of `timeZone` from UTC at `instant`. */
function tzOffsetMinutes(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - instant.getTime()) / 60_000;
}

/** The instant when it is `hour:minute` on `ymd` (YYYY-MM-DD) in `timeZone`. */
export function atLocal(ymd: string, hour: number, minute: number, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  return new Date(guess.getTime() - tzOffsetMinutes(guess, timeZone) * 60_000);
}

/** YYYY-MM-DD for `instant` in `timeZone`, optionally shifted by whole days. */
export function localYmd(instant: Date, timeZone: string, addDays = 0) {
  const shifted = new Date(instant.getTime() + addDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(shifted);
}
