"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Display-only countdown. The server decides when an auction ends; this
 * never gates an action. Ticks every second in the final hour, else every 30s.
 */
export function Countdown({
  endsAt,
  className,
  onEnd,
}: {
  endsAt: string | Date;
  className?: string;
  onEnd?: () => void;
}) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  const left = end - now;

  useEffect(() => {
    if (left <= 0) {
      onEnd?.();
      return;
    }
    const t = setTimeout(() => setNow(Date.now()), left < 3_600_000 ? 1000 : 30_000);
    return () => clearTimeout(t);
  }, [left, onEnd]);

  const urgent = left > 0 && left < 3_600_000;
  return (
    <time
      dateTime={new Date(end).toISOString()}
      suppressHydrationWarning
      className={cn("font-mono tabular", urgent && "text-accent", className)}
    >
      {formatRemaining(left)}
    </time>
  );
}
