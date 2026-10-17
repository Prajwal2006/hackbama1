import { Clock, MousePointerClick, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CampusTheme } from "@/components/shell/CampusTheme";
import { Wordmark } from "@/components/shell/Wordmark";
import { getCampus } from "@/config/campuses";
import { StartTour } from "@/features/tour/StartTour";
import { TOUR_STEPS, TOUR_TOTAL_SECONDS } from "@/features/tour/steps";
import { dataMode, demoToolsEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Guided demo", description: "A 5-minute guided tour of Dibs at The University of Alabama." };

export default function DemoPage() {
  const ua = getCampus("ua")!;
  return (
    <div data-campus="ua" className="grain min-h-dvh bg-bg px-safe py-10">
      <CampusTheme campus={ua} />
      <div className="mx-auto max-w-4xl">
        <Link href="/" aria-label="Dibs home">
          <Wordmark className="text-4xl" campus="UA" />
        </Link>
        <p className="mt-10 font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Judge mode · The University of Alabama</p>
        <h1 className="mt-3 font-display text-fluid-xl font-extrabold">
          The whole idea in <span className="text-accent">under 5 minutes.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">
          A guided walk through every feature on the real app. Each stop spotlights the part that matters, says what it does in one breath, and
          invites you to try it. Use Next / Back (or ← →) and leave any time.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <StartTour />
          <Link href="/ua" className="text-sm font-semibold text-ink-2 underline-offset-4 hover:underline">
            or explore on your own →
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-3">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4" /> {TOUR_STEPS.length} stops · ~{Math.round(TOUR_TOTAL_SECONDS / 60 * 10) / 10} min
          </li>
          <li className="inline-flex items-center gap-1.5">
            <MousePointerClick className="size-4" /> Signs you in as a seeded UA student
          </li>
          {demoToolsEnabled ? (
            <li className="inline-flex items-center gap-1.5">
              <RotateCcw className="size-4" /> Resets {dataMode === "mock" ? "demo" : "the demo database"} to a fresh state
            </li>
          ) : null}
        </ul>

        <ol className="mt-12 grid gap-2 sm:grid-cols-2">
          {TOUR_STEPS.map((s, i) => (
            <li key={s.id} className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
              <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-mono text-[0.68rem] tracking-[0.15em] text-ink-3 uppercase">{s.kicker}</span>
                <span className="font-semibold">{s.title}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
