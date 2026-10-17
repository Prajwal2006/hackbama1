import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} {...props} />;
}

export function Chip({
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
        active ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grain flex flex-col items-center rounded-[1.5rem] border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      <span className="stamp mb-5 text-2xl opacity-60">nada</span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {body ? <p className="mt-2 max-w-sm text-ink-2">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  kicker,
  title,
  action,
  className,
}: {
  kicker?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {kicker ? <p className="mb-1 font-mono text-xs tracking-[0.18em] text-ink-3 uppercase">{kicker}</p> : null}
        <h2 className="font-display text-fluid-lg font-extrabold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
