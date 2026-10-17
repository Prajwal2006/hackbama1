import { ArrowRight, HandCoins, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { pickupSpotName } from "@/config/campuses";
import { getRepo } from "@/data";
import type { Category } from "@/data/types";
import { HandoffCard, type HandoffCardData } from "@/features/handoffs/components/HandoffCard";
import { requireMember } from "@/lib/campus";
import { atLocal, formatInZone, localYmd } from "@/lib/time";

export const metadata: Metadata = { title: "Handoffs" };

export default async function HandoffsPage({ params }: PageProps<"/[campus]/x/handoffs">) {
  const slug = (await params).campus;
  const { campus, viewer } = await requireMember(slug, `/${slug}/x/handoffs`);
  const handoffs = await getRepo().listHandoffs(viewer.actor);
  const now = new Date();
  const tz = campus.timezone;

  const quickTimes = [
    { label: "Tomorrow 5 PM", iso: atLocal(localYmd(now, tz, 1), 17, 0, tz).toISOString(), phase: "move_out" as const },
    { label: "In 2 days, noon", iso: atLocal(localYmd(now, tz, 2), 12, 0, tz).toISOString(), phase: "move_out" as const },
    { label: "Move-out day 10 AM", iso: atLocal(campus.moveOutDate, 10, 0, tz).toISOString(), phase: "move_out" as const },
    { label: "Move-in day 2 PM", iso: atLocal(campus.moveInDate, 14, 0, tz).toISOString(), phase: "move_in" as const },
    { label: "Day after move-in, noon", iso: atLocal(localYmd(atLocal(campus.moveInDate, 12, 0, tz), tz, 1), 12, 0, tz).toISOString(), phase: "move_in" as const },
  ].filter((q) => new Date(q.iso) > now);

  const cards: HandoffCardData[] = handoffs.map((h) => ({
    id: h.id,
    listingId: h.listingId,
    title: h.listingTitle,
    image: h.listingImage,
    category: h.listingCategory as Category,
    artSeed: h.listingArtSeed,
    role: h.role,
    otherName: h.role === "buyer" ? h.sellerName : h.buyerName,
    amountCents: h.amountCents,
    phase: h.phase,
    scheduledAt: h.scheduledAt?.toISOString() ?? null,
    scheduledLabel: h.scheduledAt ? formatInZone(h.scheduledAt, tz) : null,
    holdForMoveIn: h.holdForMoveIn,
    spot: pickupSpotName(campus, h.pickupSpotId),
    status: h.status,
    paymentMethod: h.paymentMethod,
    paymentSentAt: h.paymentSentAt?.toISOString() ?? null,
    paymentReceivedAt: h.paymentReceivedAt?.toISOString() ?? null,
    source: h.source,
  }));
  const open = cards.filter((c) => c.status === "pending");
  const done = cards.filter((c) => c.status === "completed");

  // Timeline: today → move-out → move-in, with scheduled pickups as pins.
  const start = now.getTime();
  const moveOut = atLocal(campus.moveOutDate, 12, 0, tz).getTime();
  const moveIn = atLocal(campus.moveInDate, 12, 0, tz).getTime();
  const end = moveIn + 5 * 86_400_000;
  const pos = (t: number) => `${Math.min(100, Math.max(0, ((t - start) / (end - start)) * 100))}%`;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Move-out → move-in</p>
      <h1 className="font-display text-fluid-xl font-extrabold">Handoffs</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Every dibs and auction win becomes a handoff: pick a time (now, during move-out week, or held until move-in), pay however you
        like outside Dibs, and both of you tick it off.
      </p>

      <section className="mt-6 rounded-[1.5rem] border border-line bg-surface p-5" aria-label="Semester timeline" data-tour="timeline">
        <div className="relative mt-6 mb-10 h-2 rounded-full bg-surface-2">
          <div className="absolute inset-y-0 left-0 rounded-full bg-accent/40" style={{ width: pos(moveOut) }} />
          {[
            { t: start, label: "Today" },
            { t: moveOut, label: `Move-out · ${campus.moveOutDate.slice(5).replace("-", "/")}` },
            { t: moveIn, label: `Move-in · ${campus.moveInDate.slice(5).replace("-", "/")}` },
          ].map((m) => (
            <div key={m.label} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(m.t) }}>
              <span className="block size-4 rounded-full border-4 border-bg bg-ink" />
              <span className="absolute top-5 left-1/2 -translate-x-1/2 font-mono text-[0.68rem] whitespace-nowrap text-ink-3">{m.label}</span>
            </div>
          ))}
          {open
            .filter((c) => c.scheduledAt)
            .map((c) => (
              <div key={c.id} className="absolute -top-7 -translate-x-1/2" style={{ left: pos(new Date(c.scheduledAt!).getTime()) }} title={`${c.title} · ${c.scheduledLabel}`}>
                <span className="grid size-6 place-items-center rounded-full bg-accent text-[0.6rem] font-bold text-accent-ink shadow">
                  {c.role === "buyer" ? "IN" : "OUT"}
                </span>
              </div>
            ))}
        </div>
        <div className="grid gap-3 text-sm text-ink-2 sm:grid-cols-2">
          <p className="flex gap-2">
            <Truck className="size-4 shrink-0 text-accent" /> Leaving campus? Hand things off before move-out — or, if you can stash it, hold it for a student arriving at move-in.
          </p>
          <p className="flex gap-2">
            <HandCoins className="size-4 shrink-0 text-accent" /> Venmo, Zelle, Cash App, cash — your call. Dibs only records that the buyer sent it and the seller got it.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-extrabold">In progress · {open.length}</h2>
        {open.length ? (
          <div className="flex flex-col gap-4">
            {open.map((h) => (
              <HandoffCard key={h.id} campus={campus.slug} h={h} moveInDate={campus.moveInDate} quickTimes={quickTimes} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No handoffs yet"
            body="Call dibs on something or win an auction and it shows up here."
            action={
              <Link href={`/${campus.slug}/browse`} className={buttonVariants()}>
                Browse <ArrowRight />
              </Link>
            }
          />
        )}
      </section>
      {done.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-extrabold">Done · {done.length}</h2>
          <div className="flex flex-col gap-3">
            {done.map((h) => (
              <HandoffCard key={h.id} campus={campus.slug} h={h} moveInDate={campus.moveInDate} quickTimes={quickTimes} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
