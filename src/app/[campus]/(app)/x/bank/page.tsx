import { Recycle, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getBank } from "@/data";
import { DepositForm } from "@/features/bank/components/DepositForm";
import { DormBuilder } from "@/features/bank/components/DormBuilder";
import { FuturesTimeline } from "@/features/bank/components/FuturesTimeline";
import { loadCampusContext } from "@/lib/campus";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Furniture Bank" };

export default async function BankPage({ params }: PageProps<"/[campus]/x/bank">) {
  const { campus, viewer, isMember } = await loadCampusContext((await params).campus);
  const bank = getBank();
  const [inventory, reservations, deposits] = await Promise.all([
    bank.listInventory(campus.slug),
    viewer ? bank.myReservations(viewer.actor) : Promise.resolve([]),
    viewer ? bank.myDeposits(viewer.actor) : Promise.resolve([]),
  ]);
  const inStorage = inventory.filter((i) => i.status === "available").length;
  const reused = inventory.reduce((s, i) => s + i.cycles, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <section className="grain relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-6 md:p-9" data-tour="bank-hero">
        <div className="absolute -top-24 -right-24 size-80 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, var(--glow), transparent 70%)" }} aria-hidden />
        <p className="relative font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Campus Furniture Bank · furniture futures</p>
        <h1 className="relative mt-3 max-w-3xl font-display text-fluid-xl font-extrabold">
          Sell it in May. Bought in June. <span className="text-accent">Delivered in August.</span>
        </h1>
        <p className="relative mt-3 max-w-2xl text-lg text-ink-2">
          Leaving campus? Deposit your furniture into the bank instead of dumping it. Arriving in the fall? Build a dorm from real inventory on a budget and reserve it for move-in day. When you leave, it goes back into circulation.
        </p>
        <dl className="relative mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-xs text-ink-3">In storage now</dt>
            <dd className="font-mono text-2xl font-bold">{inStorage}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Times reused</dt>
            <dd className="font-mono text-2xl font-bold">{reused}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Cheapest desk</dt>
            <dd className="font-mono text-2xl font-bold">
              {formatCents(Math.min(...inventory.filter((i) => i.category === "desk" && i.status === "available").map((i) => i.priceCents), 99999), { compact: true })}
            </dd>
          </div>
        </dl>
        <p className="relative mt-4 flex items-center gap-2 text-xs text-ink-3">
          <Warehouse className="size-3.5" /> Prototype: inventory, reservations and status changes are real; warehouse pickup, storage and delivery are simulated.
        </p>
      </section>

      {reservations.length ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-extrabold">Your furniture futures</h2>
          <div className="flex flex-col gap-4">
            {reservations.map((r) => (
              <FuturesTimeline
                key={r.id}
                campus={campus.slug}
                r={{
                  id: r.id,
                  stage: r.stage,
                  moveInDate: r.moveInDate,
                  totalCents: r.totalCents,
                  items: r.items.map((i) => ({
                    id: i.id,
                    title: i.title,
                    code: i.inventoryCode,
                    image: i.imageUrl,
                    location: i.storageLocation,
                    cycles: i.cycles,
                    lastNote: i.history[i.history.length - 1]?.note ?? null,
                  })),
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-xl font-extrabold">The $200 dorm challenge</h2>
        <p className="mb-4 text-sm text-ink-2">Set a budget, pick what you need, and we&apos;ll assemble a room from real items sitting in storage. Review it, then reserve real items for move-in.</p>
        <DormBuilder
          campus={campus.slug}
          inventory={inventory}
          meId={viewer?.actor.userId ?? null}
          moveInDate={campus.fallMoveInDate}
          signedIn={!!viewer && isMember}
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-display text-xl font-extrabold">Moving out? Deposit instead of dumping.</h2>
          <p className="mb-4 text-sm text-ink-2">Your item gets an inventory ID and a shelf, and goes on sale to next year&apos;s students — you don&apos;t have to find a buyer before you leave.</p>
          {viewer && isMember ? (
            <DepositForm campus={campus.slug} />
          ) : (
            <Link href={`/${campus.slug}/signin?next=/${campus.slug}/x/bank`} className={buttonVariants()}>
              Sign in to deposit
            </Link>
          )}
        </div>
        <div>
          <h2 className="mb-4 font-display text-xl font-extrabold">Your deposits · {deposits.length}</h2>
          {deposits.length ? (
            <ul className="flex flex-col gap-2">
              {deposits.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {d.imageUrl ? <img src={d.imageUrl} alt="" className="size-12 rounded-lg object-cover" /> : <span className="grid size-12 place-items-center rounded-lg bg-surface-2"><Recycle className="size-5 text-ink-3" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{d.title}</span>
                    <span className="block font-mono text-xs text-ink-3">
                      {d.inventoryCode} · {d.storageLocation}
                    </span>
                  </span>
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold uppercase">{d.status === "available" ? "in storage" : d.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong p-5 text-sm text-ink-3">Nothing deposited yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
