import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getCommunity } from "@/data";
import { CycleCard, OpenRequestRow, SwapForm } from "@/features/class-swap/components/SwapUI";
import { loadCampusContext } from "@/lib/campus";
import { formatInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Class swap" };

export default async function ClassSwapPage({ params }: PageProps<"/[campus]/x/class-swap">) {
  const { campus, viewer, isMember } = await loadCampusContext((await params).campus);
  const repo = getCommunity();
  const [board, mine] = await Promise.all([
    repo.listSwaps(campus.slug),
    viewer ? repo.mySwaps(viewer.actor) : Promise.resolve({ requests: [], cycles: [] }),
  ]);
  const me = viewer?.actor.userId;
  const openBoard = board.filter((r) => r.status === "open");
  const courses = [...new Set(openBoard.map((r) => r.course))].sort();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Labs · class swap</p>
      <h1 className="font-display text-fluid-xl font-extrabold">Trade sections, not sob stories.</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        You want section 001, someone in 001 wants 003, someone in 003 wants yours. Nobody can trade one-on-one — but together it&apos;s a
        perfect loop. Dibs finds 2-, 3- and 4-way cycles and coordinates the drop/add so nobody loses a seat.
      </p>

      <div className="mt-6">
        {viewer && isMember ? (
          <SwapForm campus={campus.slug} />
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-line-strong p-5 text-sm text-ink-2">
            {viewer ? "Swaps are campus-only." : "Sign in to post a swap."}{" "}
            {!viewer ? (
              <Link className={buttonVariants({ size: "sm", className: "ml-2" })} href={`/${campus.slug}/signin?next=/${campus.slug}/x/class-swap`}>
                Sign in
              </Link>
            ) : null}
          </div>
        )}
      </div>

      {mine.cycles.length ? (
        <section className="mt-8 flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold">Your swaps</h2>
          {mine.cycles.map((c) => {
            const myReq = c.requests.find((r) => r.userId === me)!;
            return (
              <CycleCard
                key={c.id}
                campus={campus.slug}
                cycleId={c.id}
                course={c.course}
                status={c.status}
                swapAtLabel={c.swapAt ? formatInZone(c.swapAt, campus.timezone) : null}
                myRequestId={myReq.id}
                nodes={c.requests.map((r) => ({
                  requestId: r.id,
                  name: r.userName,
                  have: r.haveSection,
                  want: r.wantSection,
                  isMe: r.userId === me,
                  confirmed: c.confirmedBy.includes(r.userId),
                }))}
              />
            );
          })}
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-extrabold">Open requests · {openBoard.length}</h2>
        {courses.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <div key={course}>
                <p className="mb-2 font-mono text-xs tracking-[0.15em] text-ink-3 uppercase">{course}</p>
                <ul className="flex flex-col gap-2">
                  {openBoard
                    .filter((r) => r.course === course)
                    .map((r) => (
                      <OpenRequestRow key={r.id} campus={campus.slug} id={r.id} course={r.course} have={r.haveSection} want={r.wantSection} mine={r.userId === me} />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-3">No open requests.</p>
        )}
      </section>
    </div>
  );
}
