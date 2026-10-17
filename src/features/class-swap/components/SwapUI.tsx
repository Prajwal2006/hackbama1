"use client";

import { ArrowRightLeft, Check, Clock, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { cancelSwapAction, confirmCycleAction, createSwapAction } from "@/features/community/actions";

export type CycleNode = { requestId: string; name: string; have: string; want: string; isMe: boolean; confirmed: boolean };

export function SwapForm({ campus }: { campus: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ course: "CS 201", have: "002", want: "001", auto: false });
  return (
    <form
      data-tour="swap-form"
      className="grid gap-3 rounded-[1.5rem] border border-line bg-surface p-5 sm:grid-cols-[1.2fr_1fr_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createSwapAction(campus, { course: f.course, haveSection: f.have, wantSection: f.want, autoAccept: f.auto });
          if (!r.ok) return setError(r.message);
          if (r.data.matched) toast.success(`${r.data.size}-way swap found!`, { description: "Everyone in the loop gets the section they want." });
          else toast("Posted. We'll match you the moment a swap exists.");
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="s-course">Course</Label>
        <Input id="s-course" value={f.course} onChange={(e) => setF({ ...f, course: e.target.value })} placeholder="CS 201" />
      </div>
      <div>
        <Label htmlFor="s-have">I have section</Label>
        <Input id="s-have" value={f.have} onChange={(e) => setF({ ...f, have: e.target.value })} className="font-mono" />
      </div>
      <div>
        <Label htmlFor="s-want">I want section</Label>
        <Input id="s-want" value={f.want} onChange={(e) => setF({ ...f, want: e.target.value })} className="font-mono" />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-ink-2 sm:col-span-2">
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={f.auto} onChange={(e) => setF({ ...f, auto: e.target.checked })} />
        Auto-accept any valid swap (skip the confirm step)
      </label>
      <Button type="submit" disabled={pending} data-testid="post-swap">
        <ArrowRightLeft /> {pending ? "Matching…" : "Find my swap"}
      </Button>
      <div className="sm:col-span-3">
        <FieldError>{error}</FieldError>
      </div>
    </form>
  );
}

/** Circle of students; each arrow is a section changing hands. */
export function CycleDiagram({ nodes }: { nodes: CycleNode[] }) {
  const n = nodes.length;
  const R = 100;
  const cx = 150;
  const cy = 130;
  const pts = nodes.map((_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 300 260" className="mx-auto w-full max-w-sm" role="img" aria-label={`${n}-way swap`}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
      </defs>
      {nodes.map((node, i) => {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        // Shorten so arrows stop at the node edge, curve slightly outward.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        const s = { x: a.x + ux * 30, y: a.y + uy * 30 };
        const e = { x: b.x - ux * 32, y: b.y - uy * 32 };
        const mx = (s.x + e.x) / 2 + (s.x + e.x - 2 * cx) * 0.12;
        const my = (s.y + e.y) / 2 + (s.y + e.y - 2 * cy) * 0.12;
        return (
          <g key={node.requestId}>
            <motion.path
              d={`M${s.x},${s.y} Q${mx},${my} ${e.x},${e.y}`}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              markerEnd="url(#arrow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.2 + i * 0.25, duration: 0.6 }}
            />
            <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" className="fill-ink font-mono text-[11px] font-bold">
              §{node.have}
            </text>
          </g>
        );
      })}
      {nodes.map((node, i) => (
        <g key={`n-${node.requestId}`}>
          <circle cx={pts[i].x} cy={pts[i].y} r="27" className={node.isMe ? "fill-accent" : "fill-surface-2"} stroke="var(--line-strong)" />
          <text x={pts[i].x} y={pts[i].y - 4} textAnchor="middle" className={cn("text-[11px] font-bold", node.isMe ? "fill-accent-ink" : "fill-ink")}>
            {node.isMe ? "You" : node.name.split(" ")[0]}
          </text>
          <text x={pts[i].x} y={pts[i].y + 10} textAnchor="middle" className={cn("text-[10px]", node.isMe ? "fill-accent-ink" : "fill-ink-3")}>
            {node.confirmed ? "✓ in" : "…"}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CycleCard({
  campus,
  cycleId,
  course,
  status,
  swapAtLabel,
  nodes,
  myRequestId,
}: {
  campus: string;
  cycleId: string;
  course: string;
  status: "proposed" | "matched" | "cancelled";
  swapAtLabel: string | null;
  nodes: CycleNode[];
  myRequestId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const me = nodes.find((x) => x.isMe)!;
  const waiting = nodes.filter((x) => !x.confirmed).map((x) => (x.isMe ? "you" : x.name.split(" ")[0]));
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-line-strong bg-surface" data-testid="swap-cycle" data-tour="swap-cycle">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <p className="font-display text-lg font-extrabold">
          {course} · {nodes.length}-way swap
        </p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", status === "matched" ? "bg-success/15 text-success" : "bg-sticker text-[#16120f]")}>
          {status === "matched" ? "Locked in" : "Needs confirmations"}
        </span>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <CycleDiagram nodes={nodes} />
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-ink-2">
            You give up <strong className="font-mono text-ink">§{me.have}</strong> and get <strong className="font-mono text-ink">§{me.want}</strong>. Nobody
            has to find a perfect two-way trade — Dibs closes the loop.
          </p>
          {status === "matched" ? (
            <div className="rounded-2xl bg-success/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-success">
                <Clock className="size-4" /> Swap window: {swapAtLabel}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
                <li>Everyone logs into registration 5 minutes early.</li>
                {nodes.map((x, i) => {
                  const to = nodes[(i + 1) % nodes.length];
                  return (
                    <li key={x.requestId}>
                      {x.isMe ? "You drop" : `${x.name.split(" ")[0]} drops`} §{x.have} → {to.isMe ? "you add" : `${to.name.split(" ")[0]} adds`} it right away.
                    </li>
                  );
                })}
                <li>Tap “done” in the group chat. Registrar rules vary — check add/drop deadlines first.</li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-ink-3">Waiting on: {waiting.join(", ") || "nobody"}</p>
              <div className="flex gap-2">
                {!me.confirmed ? (
                  <Button
                    disabled={pending}
                    data-testid="confirm-swap"
                    onClick={() =>
                      start(async () => {
                        const r = await confirmCycleAction(campus, cycleId);
                        if (!r.ok) toast.error(r.message);
                        else if (r.data.matched) toast.success("Swap locked in!", { description: "Everyone confirmed. Drop/add plan is ready." });
                        else toast("Confirmed. Waiting on the others.");
                        router.refresh();
                      })
                    }
                  >
                    <Check /> I&apos;m in
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await cancelSwapAction(campus, myRequestId);
                      if (!r.ok) toast.error(r.message);
                      router.refresh();
                    })
                  }
                >
                  Back out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function OpenRequestRow({ campus, id, course, have, want, mine }: { campus: string; id: string; course: string; have: string; want: string; mine: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
      <span>
        <strong>{course}</strong> <span className="font-mono text-ink-2">§{have} → §{want}</span>
      </span>
      {mine ? (
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-ink-3">
            <Sparkles className="size-3.5" /> watching for a match
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await cancelSwapAction(campus, id);
                router.refresh();
              })
            }
          >
            Remove
          </Button>
        </span>
      ) : null}
    </li>
  );
}
