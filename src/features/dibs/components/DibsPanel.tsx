"use client";

import { Clock, Hand, MapPin } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClickSpark, type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import { Button, buttonVariants } from "@/components/ui/button";
import { cancelDibsAction, callDibsAction } from "../actions";
import { DibsStamp } from "./DibsStamp";

export type DibsPanelProps = {
  campus: string;
  campusShort: string;
  timezone: string;
  listingId: string;
  isFree: boolean;
  status: "active" | "reserved" | "sold" | "closed" | "cancelled";
  holdHours: number;
  /** Who can do what — computed on the server. */
  access: "anonymous" | "visitor" | "seller" | "member";
  myDib: { id: string; expiresAt: string } | null;
  othersDibExpiresAt: string | null;
  pickupText: string;
};

function fmt(iso: string, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function DibsPanel(p: DibsPanelProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stamp, setStamp] = useState(false);
  const spark = useRef<ClickSparkHandle>(null);
  const onStampDone = useCallback(() => setStamp(false), []);

  const claim = () =>
    start(async () => {
      const r = await callDibsAction(p.campus, p.listingId);
      if (!r.ok) {
        toast.error(r.code === "unavailable" ? "Too slow!" : "Couldn't call dibs", { description: r.message });
        router.refresh();
        return;
      }
      setStamp(true);
      spark.current?.spark();
      if (navigator.vibrate) navigator.vibrate([18, 40, 30]);
      toast.success("Dibs! It's held for you.", {
        description: `Reserved until ${fmt(r.data.expiresAt, p.timezone)}. Meet the seller to pick it up.`,
      });
      router.refresh();
    });

  const cancel = (dibId: string) =>
    start(async () => {
      const r = await cancelDibsAction(p.campus, dibId);
      if (!r.ok) toast.error(r.message);
      else toast("Reservation released", { description: "It's back on the market." });
      router.refresh();
    });

  let body: React.ReactNode;
  if (p.myDib) {
    body = (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-dashed border-accent bg-accent/8 p-4" data-testid="reservation">
        <div className="flex items-center gap-3">
          <span className="stamp text-xl">dibs</span>
          <div>
            <p className="font-display text-lg font-extrabold">It&apos;s yours — for now.</p>
            <p className="flex items-center gap-1.5 text-sm text-ink-2">
              <Clock className="size-3.5" /> Held until {fmt(p.myDib.expiresAt, p.timezone)}
            </p>
          </div>
        </div>
        <ol className="mt-4 space-y-2 text-sm text-ink-2">
          <li className="flex gap-2">
            <span className="font-mono text-accent">01</span> Meet at <strong className="text-ink">{p.pickupText}</strong>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">02</span> {p.isFree ? "Grab it — it's free." : "Pay the seller in any app (Venmo, Zelle, cash…) and mark it sent."}
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-accent">03</span> Seller confirms the handoff in Dibs.
          </li>
        </ol>
        <Link href={`/${p.campus}/x/handoffs`} className={buttonVariants({ size: "sm", className: "mt-3" })} data-testid="go-handoff">
          Schedule pickup &amp; payment →
        </Link>
        <Button variant="ghost" size="sm" className="mt-3 -ml-2" disabled={pending} onClick={() => cancel(p.myDib!.id)}>
          Release my dibs
        </Button>
      </motion.div>
    );
  } else if (p.status === "reserved") {
    body = (
      <div className="rounded-2xl border border-line-strong p-4">
        <p className="font-display text-lg font-extrabold">Someone called dibs first.</p>
        <p className="mt-1 text-sm text-ink-2">
          {p.othersDibExpiresAt
            ? `If they don't pick it up by ${fmt(p.othersDibExpiresAt, p.timezone)}, it comes back. Save it to get notified.`
            : "Save it — reservations that lapse come back on the market."}
        </p>
      </div>
    );
  } else if (p.status !== "active") {
    body = <p className="rounded-2xl border border-line-strong p-4 font-semibold text-ink-2">This item is no longer available.</p>;
  } else if (p.access === "seller") {
    body = <p className="rounded-2xl border border-line-strong p-4 text-ink-2">This is your listing. You&apos;ll get a notification the moment someone calls dibs.</p>;
  } else if (p.access === "anonymous") {
    body = (
      <Link
        href={`/${p.campus}/signin?next=${encodeURIComponent(`/${p.campus}/listing/${p.listingId}`)}`}
        className={buttonVariants({ size: "lg", className: "w-full" })}
      >
        <Hand /> Sign in to call dibs
      </Link>
    );
  } else if (p.access === "visitor") {
    body = (
      <p className="rounded-2xl border border-line-strong p-4 text-ink-2">
        Only students verified at {p.campusShort} can claim this. Cross-campus claims aren&apos;t enabled for this campus.
      </p>
    );
  } else {
    body = (
      <div>
        <Button size="lg" className="h-16 w-full text-xl" disabled={pending} onClick={claim} data-testid="call-dibs">
          <Hand className="size-6" />
          {pending ? "Calling it…" : p.isFree ? "Call dibs — it's free" : "Call dibs"}
        </Button>
        <p className="mt-2 text-center text-xs text-ink-3">
          Holds it for {p.holdHours}h. No payment in the app — you pay at pickup.
        </p>
      </div>
    );
  }

  return (
    <div className="relative" data-tour="dibs">
      <ClickSpark ref={spark} count={18} radius={110} />
      <DibsStamp show={stamp} onDone={onStampDone} />
      {body}
      <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3">
        <MapPin className="size-3.5" /> {p.pickupText}
      </p>
    </div>
  );
}
