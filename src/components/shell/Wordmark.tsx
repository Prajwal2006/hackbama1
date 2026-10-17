import { cn } from "@/lib/utils";

/** The Dibs wordmark: heavy display type with an exclamation "stamp" dot. */
export function Wordmark({ className, campus }: { className?: string; campus?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 font-display font-extrabold tracking-[-0.05em]", className)}>
      <span>
        dibs<span className="text-accent">!</span>
      </span>
      {campus ? (
        <span className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[0.55em] font-bold tracking-normal text-accent-ink uppercase">
          {campus}
        </span>
      ) : null}
    </span>
  );
}
