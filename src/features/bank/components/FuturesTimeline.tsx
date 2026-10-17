"use client";

import { FastForward, Home, Recycle, ShoppingBag, Warehouse } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { advanceReservationAction, cancelReservationAction } from "../actions";

const STAGES = [
  { id: "reserved", label: "Sold in May", sub: "Reserved from the bank", icon: ShoppingBag },
  { id: "stored", label: "Stored over summer", sub: "Held on a shelf, tagged to you", icon: Warehouse },
  { id: "delivered", label: "Delivered in August", sub: "Arrives on move-in day", icon: Home },
  { id: "returned", label: "Back in circulation", sub: "Next May it serves someone new", icon: Recycle },
] as const;

const NEXT_LABEL: Record<string, string> = {
  reserved: "Skip to summer storage",
  stored: "Skip to move-in day",
  delivered: "Skip to next May (return it)",
};

export function FuturesTimeline({
  campus,
  r,
}: {
  campus: string;
  r: {
    id: string;
    stage: string;
    moveInDate: string;
    totalCents: number;
    items: { id: string; title: string; code: string; image: string | null; location: string | null; cycles: number; lastNote: string | null }[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const idx = STAGES.findIndex((s) => s.id === r.stage);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-line-strong bg-surface" data-testid="futures-timeline" data-tour="bank-timeline">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <p className="font-display text-lg font-extrabold">
          {r.items.length} items · {formatCents(r.totalCents)} · move-in {r.moveInDate}
        </p>
        <span className="font-mono text-xs text-ink-3">{r.id.slice(-8).toUpperCase()}</span>
      </div>
      <ol className="relative grid grid-cols-4 gap-1 px-4 pt-6 pb-4">
        <div className="absolute top-[2.15rem] right-[12.5%] left-[12.5%] h-1 rounded-full bg-surface-2" aria-hidden />
        <div
          className="absolute top-[2.15rem] left-[12.5%] h-1 rounded-full bg-accent transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${(Math.max(0, idx) / (STAGES.length - 1)) * 75}%` }}
          aria-hidden
        />
        {STAGES.map((s, i) => {
          const done = i <= idx;
          return (
            <li key={s.id} className="relative flex flex-col items-center text-center" aria-current={i === idx ? "step" : undefined}>
              <motion.span
                className={cn("relative grid size-10 place-items-center rounded-full border-2", done ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-bg text-ink-3")}
                animate={i === idx ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <s.icon className="size-5" />
              </motion.span>
              <span className={cn("mt-2 text-xs font-bold sm:text-sm", done ? "text-ink" : "text-ink-3")}>{s.label}</span>
              <span className="hidden text-[0.7rem] text-ink-3 sm:block">{s.sub}</span>
            </li>
          );
        })}
      </ol>
      <ul className="grid gap-2 border-t border-line p-4 sm:grid-cols-2">
        {r.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-xl bg-bg/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {i.image ? <img src={i.image} alt="" className="size-12 rounded-lg object-cover" /> : <span className="size-12 rounded-lg bg-surface-2" />}
            <span className="min-w-0 text-sm">
              <span className="block truncate font-semibold">{i.title}</span>
              <span className="block font-mono text-[0.68rem] text-ink-3">
                {i.code} · {i.location}
                {i.cycles ? ` · ${i.cycles}× reused` : ""}
              </span>
              {i.lastNote ? <span className="block truncate text-xs text-ink-2">{i.lastNote}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {NEXT_LABEL[r.stage] ? (
          <Button
            size="sm"
            disabled={pending}
            data-testid="advance-time"
            onClick={() =>
              start(async () => {
                const res = await advanceReservationAction(campus, r.id);
                if (!res.ok) toast.error(res.message);
                else if (res.data.stage === "returned") toast.success("Back in the bank", { description: "Same furniture, next cohort. That's the loop." });
                router.refresh();
              })
            }
          >
            <FastForward /> Demo: {NEXT_LABEL[r.stage]}
          </Button>
        ) : (
          <p className="text-sm font-semibold text-success">Full cycle complete — these pieces are available to the next class.</p>
        )}
        {r.stage === "reserved" || r.stage === "stored" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await cancelReservationAction(campus, r.id);
                if (!res.ok) toast.error(res.message);
                router.refresh();
              })
            }
          >
            Cancel reservation
          </Button>
        ) : null}
        <span className="ml-auto text-xs text-ink-3">“Skip” buttons fast-forward the calendar for the demo.</span>
      </div>
    </article>
  );
}
