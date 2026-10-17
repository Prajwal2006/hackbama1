"use client";

import { Gavel, Trophy, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ClickSpark, type ClickSparkHandle } from "@/components/reactbits/ClickSpark";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, MoneyInput } from "@/components/ui/field";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Countdown } from "@/features/listings/components/Countdown";
import { centsToInputString, formatCents, parseDollarsToCents } from "@/lib/money";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { buyNowAction, placeBidAction } from "../actions";
import type { AuctionPhase } from "../domain";

export type AuctionPanelProps = {
  campus: string;
  campusShort: string;
  listingId: string;
  title: string;
  phase: AuctionPhase;
  status: string;
  outcome: string | null;
  startsAt: string;
  endsAt: string;
  startingBidCents: number;
  incrementCents: number;
  highestBidCents: number | null;
  minNextCents: number;
  buyNowCents: number | null;
  reserveMet: boolean | null;
  hasReserve: boolean;
  bids: { id: string; label: string; amountCents: number; status: string; createdAt: string; mine: boolean }[];
  access: "anonymous" | "visitor" | "seller" | "member";
  iAmHighest: boolean;
  iWon: boolean;
};

/** Refresh server state periodically while the auction is live and the tab is visible. */
function useLiveRefresh(active: boolean, everyMs = 8000) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const tick = () => document.visibilityState === "visible" && router.refresh();
    const t = setInterval(tick, everyMs);
    return () => clearInterval(t);
  }, [active, everyMs, router]);
}

export function AuctionPanel(p: AuctionPanelProps) {
  const router = useRouter();
  const live = p.phase === "live" || p.phase === "ending";
  useLiveRefresh(live);

  const [amount, setAmount] = useState(centsToInputString(p.minNextCents));
  const [confirm, setConfirm] = useState<null | { cents: number; key: string }>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const spark = useRef<ClickSparkHandle>(null);
  const [lastMin, setLastMin] = useState(p.minNextCents);

  // When someone else bids (server state moved), bump the suggested amount if it's now too low.
  if (p.minNextCents !== lastMin) {
    setLastMin(p.minNextCents);
    const typed = parseDollarsToCents(amount);
    if (typed === null || typed < p.minNextCents) setAmount(centsToInputString(p.minNextCents));
  }

  const current = p.highestBidCents ?? p.startingBidCents;
  const quick = useMemo(() => [1, 2, 5].map((k) => p.minNextCents + (k - 1) * p.incrementCents), [p.minNextCents, p.incrementCents]);

  const review = () => {
    const cents = parseDollarsToCents(amount);
    if (cents === null) return setError("Enter an amount like 45 or 45.50");
    if (cents < p.minNextCents) return setError(`Minimum bid is ${formatCents(p.minNextCents)}`);
    if (p.buyNowCents !== null && cents >= p.buyNowCents) return setError(`At that price, just use Buy now (${formatCents(p.buyNowCents)})`);
    setError(null);
    setConfirm({ cents, key: crypto.randomUUID() });
  };

  const submit = () => {
    if (!confirm) return;
    start(async () => {
      const r = await placeBidAction(p.campus, {
        listingId: p.listingId,
        amountCents: confirm.cents,
        idempotencyKey: confirm.key,
        expectedMinCents: p.minNextCents,
      });
      setConfirm(null);
      if (!r.ok) {
        if (r.code === "conflict") toast.warning("Outpaced!", { description: r.message });
        else toast.error("Bid not placed", { description: r.message });
        router.refresh();
        return;
      }
      spark.current?.spark();
      toast.success(`You're the high bidder at ${formatCents(r.data.amountCents)}`, {
        description: "We'll ping you if someone outbids you.",
      });
      router.refresh();
    });
  };

  const buyNow = () =>
    start(async () => {
      const r = await buyNowAction(p.campus, p.listingId);
      setBuyOpen(false);
      if (!r.ok) toast.error("Buy-now failed", { description: r.message });
      else {
        spark.current?.spark();
        toast.success("It's yours! 🎉", { description: "Auction closed. Arrange pickup with the seller." });
      }
      router.refresh();
    });

  const statusLine = (() => {
    if (p.phase === "cancelled") return "Cancelled by the seller";
    if (p.phase === "settled" || p.phase === "ended") {
      if (p.outcome === "bought_now") return "Closed — bought now";
      if (p.outcome === "won") return "Closed — sold";
      if (p.outcome === "reserve_not_met") return "Closed — reserve not met";
      if (p.outcome === "no_bids") return "Closed — no bids";
      return "Bidding closed · settling";
    }
    if (p.phase === "upcoming") return "Opens soon";
    return p.phase === "ending" ? "Ending soon" : "Live";
  })();

  return (
    <div className="relative">
      <ClickSpark ref={spark} count={16} radius={100} />
      <div className="rounded-[1.4rem] border border-line bg-surface p-4 sm:p-5" data-testid="auction-panel">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
              live ? "bg-accent/12 text-accent" : "bg-surface-2 text-ink-2",
            )}
          >
            {live ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
            {statusLine}
          </span>
          {live || p.phase === "upcoming" ? (
            <span className="text-sm text-ink-2">
              {p.phase === "upcoming" ? "Opens in " : "Ends in "}
              <Countdown
                endsAt={p.phase === "upcoming" ? p.startsAt : p.endsAt}
                className="font-bold text-ink"
                onEnd={() => router.refresh()}
              />
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-wider text-ink-3 uppercase">
              {p.highestBidCents === null ? "Starting bid" : p.phase === "settled" && p.outcome === "won" ? "Winning bid" : "Current bid"}
            </p>
            {/* Re-keyed on change so a *real* price move pops in; no exit node lingers. */}
            <motion.p
              key={current}
              initial={{ y: 18, opacity: 0.2, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="font-mono text-5xl font-bold tracking-tight tabular"
              data-testid="current-bid"
            >
              {formatCents(current)}
            </motion.p>
          </div>
          <div className="text-right text-sm text-ink-2">
            <p className="font-mono text-2xl font-bold text-ink tabular">{p.bids.length}</p>
            <p>bids</p>
          </div>
        </div>

        {p.hasReserve && p.phase !== "settled" ? (
          <p className="mt-2 text-sm text-ink-3">{p.reserveMet ? "Reserve met ✓" : "Reserve not met yet"}</p>
        ) : null}

        {p.iWon ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sticker p-4 text-[#16120f]">
            <Trophy className="size-6" />
            <p className="font-display font-extrabold">You won this one. Message the seller and arrange pickup.</p>
          </div>
        ) : null}

        {live && p.access === "member" ? (
          <div className="mt-5">
            {p.iAmHighest ? (
              <p className="mb-3 rounded-xl bg-success/12 px-3 py-2 text-sm font-semibold text-success">You&apos;re the highest bidder.</p>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                review();
              }}
            >
              <label htmlFor="bid-amount" className="mb-1.5 block text-sm font-semibold text-ink-2">
                Your bid · minimum {formatCents(p.minNextCents)}
              </label>
              <div className="flex gap-2">
                <MoneyInput
                  id="bid-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={!!error}
                  className="flex-1 [&_input]:h-14 [&_input]:text-xl"
                  data-testid="bid-input"
                />
                <Button type="submit" size="lg" className="h-14" disabled={pending || p.iAmHighest} data-testid="review-bid">
                  <Gavel /> Bid
                </Button>
              </div>
              <FieldError>{error}</FieldError>
              <div className="mt-2 flex gap-2">
                {quick.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAmount(centsToInputString(c))}
                    className="h-11 flex-1 rounded-full border border-line-strong font-mono text-sm font-semibold hover:border-accent"
                  >
                    {formatCents(c, { compact: true })}
                  </button>
                ))}
              </div>
            </form>
            {p.buyNowCents !== null ? (
              <Button variant="ink" className="mt-3 w-full" onClick={() => setBuyOpen(true)} disabled={pending}>
                <Zap /> Buy now for {formatCents(p.buyNowCents)}
              </Button>
            ) : null}
          </div>
        ) : null}

        {live && p.access === "anonymous" ? (
          <Link
            href={`/${p.campus}/signin?next=${encodeURIComponent(`/${p.campus}/listing/${p.listingId}`)}`}
            className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
          >
            Sign in to bid
          </Link>
        ) : null}
        {live && p.access === "visitor" ? (
          <p className="mt-5 text-sm text-ink-2">Only students verified at {p.campusShort} can bid here.</p>
        ) : null}
        {live && p.access === "seller" ? (
          <p className="mt-5 text-sm text-ink-2">Your auction. You can&apos;t bid on it — that&apos;s shill bidding.</p>
        ) : null}
      </div>

      <section className="mt-5" aria-label="Bid history">
        <h3 className="mb-2 font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Bid history</h3>
        {p.bids.length ? (
          <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            <AnimatePresence initial={false}>
              {p.bids.map((b, i) => (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, backgroundColor: "color-mix(in oklab, var(--accent) 22%, transparent)" }}
                  animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                  transition={{ duration: 0.8 }}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className={cn("font-semibold", b.mine && "text-accent")}>
                    {b.label}
                    {i === 0 && (b.status === "active" || b.status === "winning") ? (
                      <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[0.68rem] text-ink-2 uppercase">
                        {b.status === "winning" ? "winner" : "high"}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-ink-3" suppressHydrationWarning>
                      {relativeTime(new Date(b.createdAt))}
                    </span>
                    <span className="font-mono font-bold tabular">{formatCents(b.amountCents)}</span>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">
            No bids yet. Opening bid is {formatCents(p.startingBidCents)}.
          </p>
        )}
      </section>

      <Sheet open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <SheetContent title="Confirm your bid" description={p.title}>
          <p className="font-mono text-5xl font-bold tabular">{confirm ? formatCents(confirm.cents) : ""}</p>
          <p className="mt-3 text-sm text-ink-2">
            If you win, you&apos;re committing to buy at this price and pay the seller at pickup. Bids can&apos;t be withdrawn.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submit} disabled={pending} data-testid="confirm-bid">
              {pending ? "Placing…" : "Place bid"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={buyOpen} onOpenChange={setBuyOpen}>
        <SheetContent title="Buy it now?" description="This ends the auction immediately.">
          <p className="font-mono text-5xl font-bold tabular">{p.buyNowCents !== null ? formatCents(p.buyNowCents) : ""}</p>
          <p className="mt-3 text-sm text-ink-2">Other bidders will be notified. You pay the seller at pickup.</p>
          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setBuyOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={buyNow} disabled={pending}>
              {pending ? "Buying…" : "Buy now"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
