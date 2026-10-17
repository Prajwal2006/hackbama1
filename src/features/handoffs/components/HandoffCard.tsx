"use client";

import { CalendarClock, CheckCircle2, MapPin, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ItemArt } from "@/components/art/ItemArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { Category } from "@/data/types";
import { PaymentAck } from "@/features/community/components/PaymentAck";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ackHandoffAction, completeHandoffAction, scheduleHandoffAction } from "../actions";

export type HandoffCardData = {
  id: string;
  listingId: string;
  title: string;
  image: string | null;
  category: Category;
  artSeed: number;
  role: "buyer" | "seller";
  otherName: string;
  amountCents: number;
  phase: "move_out" | "move_in";
  scheduledAt: string | null;
  scheduledLabel: string | null;
  holdForMoveIn: boolean;
  spot: string | null;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: string | null;
  paymentSentAt: string | null;
  paymentReceivedAt: string | null;
  source: "dibs" | "auction";
};

/** Local datetime-input value for a Date. */
function local(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function HandoffCard({
  campus,
  h,
  moveInDate,
  quickTimes,
}: {
  campus: string;
  h: HandoffCardData;
  moveInDate: string;
  quickTimes: { label: string; iso: string; phase: "move_out" | "move_in" }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState(h.phase);
  const [when, setWhen] = useState(h.scheduledAt ? local(new Date(h.scheduledAt)) : "");
  const [editing, setEditing] = useState(!h.scheduledAt);
  const done = h.status === "completed";
  const paid = h.amountCents === 0 || !!h.paymentReceivedAt;

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.message ?? "That didn't work");
      else toast.success(msg);
      router.refresh();
    });

  const steps = [
    { label: "Scheduled", done: !!h.scheduledAt },
    { label: h.amountCents ? "Paid" : "Free", done: paid },
    { label: "Handed off", done },
  ];

  return (
    <article className={cn("overflow-hidden rounded-[1.5rem] border bg-surface", done ? "border-line opacity-80" : "border-line-strong")} data-testid="handoff-card">
      <div className="flex gap-4 p-4">
        <Link href={`/${campus}/listing/${h.listingId}`} className="size-20 shrink-0 overflow-hidden rounded-2xl border border-line">
          {h.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={h.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <ItemArt category={h.category} seed={h.artSeed} />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.68rem] tracking-[0.15em] text-ink-3 uppercase">
            {h.role === "buyer" ? `Picking up from ${h.otherName}` : `Handing off to ${h.otherName}`}
            {h.source === "auction" ? " · auction win" : ""}
          </p>
          <h3 className="truncate font-display text-lg font-extrabold">{h.title}</h3>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-ink-2">
            <span className="font-mono font-bold text-ink">{h.amountCents ? formatCents(h.amountCents) : "Free"}</span>
            {h.spot ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {h.spot}
              </span>
            ) : null}
            {h.scheduledLabel ? (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" /> {h.scheduledLabel}
              </span>
            ) : null}
          </p>
          <ol className="mt-2 flex gap-1" aria-label="Progress">
            {steps.map((s) => (
              <li key={s.label} className={cn("h-1.5 flex-1 rounded-full", s.done ? "bg-accent" : "bg-surface-2")} title={s.label} />
            ))}
          </ol>
        </div>
      </div>

      {done ? (
        <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" /> Handed off. All square.
        </p>
      ) : (
        <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">
          <div data-tour="schedule">
            <p className="mb-2 text-sm font-semibold">1 · When &amp; which window</p>
            {editing ? (
              <>
                <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-xs font-semibold">
                  {(["move_out", "move_in"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={p === "move_in" && !h.holdForMoveIn}
                      onClick={() => setPhase(p)}
                      className={cn("min-h-9 rounded-full disabled:opacity-40", phase === p ? "bg-bg text-ink shadow" : "text-ink-3")}
                      title={p === "move_in" && !h.holdForMoveIn ? "Seller can't hold this until move-in" : undefined}
                    >
                      {p === "move_out" ? "Move-out" : `Move-in (${moveInDate.slice(5).replace("-", "/")})`}
                    </button>
                  ))}
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {quickTimes
                    .filter((q) => q.phase === phase)
                    .map((q) => (
                      <button key={q.iso} type="button" onClick={() => setWhen(local(new Date(q.iso)))} className="min-h-9 rounded-full border border-line-strong px-3 text-xs font-semibold hover:border-accent">
                        {q.label}
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Pickup time" className="h-10 text-sm" />
                  <Button
                    size="sm"
                    className="h-10"
                    disabled={pending || !when}
                    data-testid="schedule-handoff"
                    onClick={() =>
                      run(async () => {
                        const r = await scheduleHandoffAction(campus, h.id, phase, new Date(when).toISOString());
                        if (r.ok) setEditing(false);
                        return r;
                      }, phase === "move_in" ? "Held for move-in" : "Pickup scheduled")
                    }
                  >
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2.5 text-sm">
                <span>
                  <span className="mr-1.5 rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-bold text-accent-ink uppercase">
                    {h.phase === "move_in" ? "move-in" : "move-out"}
                  </span>
                  {h.scheduledLabel}
                </span>
                <button type="button" className="text-xs font-semibold text-ink-3 hover:text-ink" onClick={() => setEditing(true)}>
                  Change
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-2 text-sm font-semibold">2 · Payment {h.amountCents ? "" : "(free item)"}</p>
              {h.amountCents ? (
                <PaymentAck
                  role={h.role === "buyer" ? "payer" : "payee"}
                  amountCents={h.amountCents}
                  method={h.paymentMethod}
                  sentAt={h.paymentSentAt}
                  receivedAt={h.paymentReceivedAt}
                  pending={pending}
                  payerName={h.role === "buyer" ? "You" : h.otherName}
                  payeeName={h.role === "seller" ? "You" : h.otherName}
                  onSent={(m) => run(() => ackHandoffAction(campus, h.id, "sent", m), `Marked as sent via ${m}`)}
                  onReceived={() => run(() => ackHandoffAction(campus, h.id, "received", null), "Payment confirmed")}
                />
              ) : (
                <p className="rounded-2xl bg-surface-2 px-3 py-2.5 text-sm text-ink-2">Nothing to pay. Just show up.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">3 · Handoff</p>
              {h.role === "seller" ? (
                <Button
                  variant={paid ? "primary" : "outline"}
                  className="w-full"
                  disabled={pending || !paid}
                  data-testid="complete-handoff"
                  onClick={() => run(() => completeHandoffAction(campus, h.id), "Handoff complete — listing marked sold")}
                >
                  <PackageCheck /> {paid ? "Mark handed off" : "Confirm payment first"}
                </Button>
              ) : (
                <p className="rounded-2xl bg-surface-2 px-3 py-2.5 text-sm text-ink-2">The seller taps “handed off” when you&apos;ve got it.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
