"use client";

import { ArrowRight, CalendarClock, Car, Luggage, MapPin, Minus, Plane, Plus, Repeat, Users, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ackMemberAction, closePostAction, joinPostAction, leavePostAction } from "../actions";
import { PaymentAck } from "./PaymentAck";

export type PostCardData = {
  id: string;
  kind: "sub" | "ride" | "meal";
  title: string;
  body: string;
  ownerName: string;
  capacity: number;
  taken: number;
  unitPriceCents: number;
  whenLabel: string;
  imageUrl: string | null;
  status: "open" | "full" | "closed" | "cancelled";
  data: Record<string, unknown>;
  isOwner: boolean;
  signedIn: boolean;
  canJoin: boolean;
  mine: { id: string; quantity: number; paymentMethod: string | null; paymentSentAt: string | null; paymentReceivedAt: string | null } | null;
  members: { id: string; name: string; quantity: number; paymentMethod: string | null; paymentSentAt: string | null; paymentReceivedAt: string | null }[];
};

const UNIT = { sub: "seat", ride: "seat", meal: "portion" } as const;

export function PostCard({ campus, p }: { campus: string; p: PostCardData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(1);
  const left = p.capacity - p.taken;
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.message ?? "That didn't work");
      else toast.success(msg);
      router.refresh();
    });

  const str = (k: string) => (typeof p.data[k] === "string" ? (p.data[k] as string) : "");
  const d = {
    service: str("service"), cycle: str("cycle"), dish: str("dish"), from: str("from"), to: str("to"),
    luggage: str("luggage"), pickupSpot: str("pickupSpot"), trade: str("trade"),
    trip: p.data.trip === true,
    totalCents: Number(p.data.totalCents ?? 0),
    dietary: Array.isArray(p.data.dietary) ? (p.data.dietary as string[]) : [],
  };
  const price =
    p.unitPriceCents === 0
      ? p.kind === "meal" && d.trade
        ? "Trade"
        : "Free"
      : `${formatCents(p.unitPriceCents)}${p.kind === "sub" ? (d.cycle === "yearly" ? "/yr" : "/mo") : ""}`;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-line bg-surface" data-testid={`post-${p.kind}`}>
      {p.imageUrl ? (
        <div className="relative aspect-[16/8] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span className="sticker absolute right-3 bottom-3 bg-accent px-3 py-1 font-mono text-accent-ink rotate-2">{price}</span>
        </div>
      ) : null}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.68rem] tracking-[0.15em] text-ink-3 uppercase">
              {p.kind === "sub" ? d.service : p.kind === "ride" ? (d.trip ? "Trip" : "Ride") : d.dish} · by {p.isOwner ? "you" : p.ownerName}
            </p>
            <h3 className="font-display text-lg leading-tight font-extrabold">{p.title}</h3>
          </div>
          {!p.imageUrl ? <span className="sticker shrink-0 bg-accent px-3 py-1 font-mono text-sm text-accent-ink rotate-2">{price}</span> : null}
        </div>

        {p.kind === "ride" ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold">
            {d.trip ? <Plane className="size-4 text-accent" /> : <Car className="size-4 text-accent" />}
            {d.from} <ArrowRight className="size-4 text-ink-3" /> {d.to}
          </p>
        ) : null}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          <li className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" /> {p.whenLabel}
          </li>
          {p.kind === "meal" ? (
            <li className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {d.pickupSpot}
            </li>
          ) : null}
          {p.kind === "ride" && d.luggage ? (
            <li className="inline-flex items-center gap-1">
              <Luggage className="size-3.5" /> {d.luggage}
            </li>
          ) : null}
          {p.kind === "sub" ? (
            <li className="inline-flex items-center gap-1">
              <Repeat className="size-3.5" /> {formatCents(d.totalCents)} {d.cycle} split {p.capacity + 1} ways
            </li>
          ) : null}
          <li className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {left > 0 ? `${left} of ${p.capacity} ${UNIT[p.kind]}s left` : "Full"}
          </li>
        </ul>
        {p.kind === "meal" && (d.dietary?.length || d.trade) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.dietary.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-2">
                {t}
              </span>
            ))}
            {d.trade ? <span className="rounded-full bg-sticker px-2 py-0.5 text-xs font-semibold text-[#16120f]">trade: {d.trade}</span> : null}
          </div>
        ) : null}
        {p.body ? <p className="mt-3 text-sm text-ink-2">{p.body}</p> : null}

        <div className="mt-3 flex -space-x-2" aria-label={`${p.taken} joined`}>
          {Array.from({ length: p.capacity }, (_, i) => (
            <span
              key={i}
              className={cn("grid size-7 place-items-center rounded-full border-2 border-surface text-[0.6rem] font-bold", i < p.taken ? "bg-accent-2 text-[#16120f]" : "bg-surface-2 text-ink-3")}
            >
              {i < p.taken ? "✓" : ""}
            </span>
          ))}
        </div>

        {/* ——— Actions ——— */}
        <div className="mt-4">
          {p.isOwner ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">Who&apos;s in</p>
              {p.members.length ? (
                p.members.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-line p-3">
                    <p className="mb-2 text-sm">
                      <strong>{m.name}</strong> × {m.quantity}
                    </p>
                    {p.unitPriceCents ? (
                      <PaymentAck
                        role="payee"
                        amountCents={p.unitPriceCents * m.quantity}
                        method={m.paymentMethod}
                        sentAt={m.paymentSentAt}
                        receivedAt={m.paymentReceivedAt}
                        pending={pending}
                        payerName={m.name.split(" ")[0]}
                        payeeName="You"
                        onSent={() => {}}
                        onReceived={() => run(() => ackMemberAction(campus, m.id, "received", null), `Confirmed ${m.name}'s payment`)}
                      />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-3">Nobody yet. Share it in your group chat.</p>
              )}
              {p.status !== "closed" ? (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => closePostAction(campus, p.id), "Closed")}>
                  Close this post
                </Button>
              ) : null}
            </div>
          ) : p.mine ? (
            <div className="flex flex-col gap-2">
              <p className="rounded-xl bg-success/12 px-3 py-2 text-sm font-semibold text-success">
                You&apos;re in × {p.mine.quantity}
              </p>
              {p.unitPriceCents ? (
                <PaymentAck
                  role="payer"
                  amountCents={p.unitPriceCents * p.mine.quantity}
                  method={p.mine.paymentMethod}
                  sentAt={p.mine.paymentSentAt}
                  receivedAt={p.mine.paymentReceivedAt}
                  pending={pending}
                  payerName="You"
                  payeeName={p.ownerName.split(" ")[0]}
                  onSent={(m) => run(() => ackMemberAction(campus, p.mine!.id, "sent", m), `Marked as sent via ${m}`)}
                  onReceived={() => {}}
                />
              ) : null}
              {!p.mine.paymentReceivedAt ? (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => leavePostAction(campus, p.id), "You left")}>
                  Leave
                </Button>
              ) : null}
            </div>
          ) : p.status === "open" && p.canJoin ? (
            <div className="flex items-center gap-2">
              {p.kind !== "sub" ? (
                <div className="flex items-center rounded-full border border-line-strong">
                  <button type="button" aria-label="Fewer" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus className="size-4" />
                  </button>
                  <span className="w-6 text-center font-mono font-bold">{qty}</span>
                  <button type="button" aria-label="More" className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.min(left, q + 1))}>
                    <Plus className="size-4" />
                  </button>
                </div>
              ) : null}
              <Button className="flex-1" disabled={pending || left < 1} data-testid={`join-${p.kind}`} onClick={() => run(() => joinPostAction(campus, p.id, qty), p.kind === "meal" ? "Claimed! See you at pickup." : "You're in!")}>
                {p.kind === "meal" ? <Utensils /> : p.kind === "ride" ? <Car /> : <Users />}
                {p.kind === "meal" ? "Claim" : p.kind === "ride" ? "Grab a seat" : "Join the split"}
                {p.unitPriceCents ? ` · ${formatCents(p.unitPriceCents * qty)}` : ""}
              </Button>
            </div>
          ) : !p.signedIn ? (
            <Button variant="outline" className="w-full" onClick={() => router.push(`/${campus}/signin?next=${encodeURIComponent(location.pathname)}`)}>
              Sign in to join
            </Button>
          ) : (
            <p className="text-sm text-ink-3">{p.status === "full" ? "Full right now." : p.status === "closed" ? "Closed." : "Only students at this campus can join."}</p>
          )}
        </div>
      </div>
    </article>
  );
}
