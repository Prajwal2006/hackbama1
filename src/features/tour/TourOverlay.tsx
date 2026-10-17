"use client";

import { ArrowLeft, ArrowRight, Hand, Timer, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { TOUR_BUDGET_SECONDS, TOUR_STEPS } from "./steps";

const KEY = "dibs-tour";
type State = { step: number; startedAt: number } | null;

// sessionStorage-backed store so the tour survives navigations and reloads.
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: State } = { raw: null, value: null };
function read(): State {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) {
    try {
      cache = { raw, value: raw ? (JSON.parse(raw) as State) : null };
    } catch {
      cache = { raw, value: null };
    }
  }
  return cache.value;
}
function write(v: State) {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}
export function startTourClient() {
  write({ step: 0, startedAt: Date.now() });
}

function samePath(a: string, route: string) {
  return a === route.split("?")[0];
}

/** Spotlight ring around `[data-tour=target]`, tracking scroll/resize. */
function useTargetRect(target: string | undefined, path: string) {
  const [found, setRect] = useState<{ key: string; rect: DOMRect | null }>({ key: "", rect: null });
  const key = `${target}|${path}`;
  useEffect(() => {
    if (!target) return;
    let el: Element | null = null;
    let raf = 0;
    let tries = 0;
    const measure = () => {
      if (!el || !el.isConnected) el = document.querySelector(`[data-tour="${target}"]`);
      setRect({ key, rect: el ? el.getBoundingClientRect() : null });
    };
    const find = () => {
      el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        // Phones: park the target in the top half so the bottom card never covers it.
        const phone = window.matchMedia("(max-width: 767px)").matches;
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, phone ? top - 90 : top - window.innerHeight / 2 + el.getBoundingClientRect().height / 2), behavior: "smooth" });
        setTimeout(measure, 350);
      } else if (tries++ < 20) setTimeout(find, 250);
    };
    find();
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    const tick = setInterval(measure, 800); // layout can shift after server refreshes
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      clearInterval(tick);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [target, path, key]);
  // Stale measurements from a previous step are ignored.
  return target && found.key === key ? found.rect : null;
}

export function TourOverlay() {
  const state = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [now, setNow] = useState(() => Date.now());
  const step = state ? TOUR_STEPS[state.step] : null;
  const rect = useTargetRect(step && samePath(pathname, step.route) ? step.target : undefined, pathname + search.toString());

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state]);

  const go = useCallback(
    (i: number) => {
      if (!state) return;
      if (i >= TOUR_STEPS.length) {
        write(null);
        return;
      }
      const next = Math.max(0, i);
      write({ ...state, step: next });
      router.push(TOUR_STEPS[next].route, { scroll: true });
    },
    [state, router],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") go(state.step + 1);
      if (e.key === "ArrowLeft") go(state.step - 1);
      if (e.key === "Escape") write(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, go]);

  if (!state || !step) return null;
  const elapsed = Math.max(0, Math.floor((now - state.startedAt) / 1000));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const onRoute = samePath(pathname, step.route);
  const last = state.step === TOUR_STEPS.length - 1;
  const pad = 8;
  // Desktop: dock the card in the corner farthest from the spotlight.
  const wide = typeof window !== "undefined" && window.innerWidth >= 768;
  const tcx = rect ? rect.left + rect.width / 2 : 0;
  const tcy = rect ? rect.top + rect.height / 2 : 0;
  const dockLeft = wide && !!rect && onRoute && tcx > window.innerWidth * 0.5;
  const dockTop = wide && !!rect && onRoute && tcy > window.innerHeight * 0.55 && rect.top > 340;

  return (
    <>
      <AnimatePresence>
        {rect && onRoute ? (
          <motion.div
            key={step.id}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed z-[65] rounded-[1.25rem] ring-4 ring-accent transition-[top,left,width,height] duration-300"
            style={{
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.42), 0 0 40px 6px color-mix(in oklab, var(--accent) 55%, transparent)",
            }}
          />
        ) : null}
      </AnimatePresence>

      <motion.aside
        key="tour-card"
        role="dialog"
        aria-label={`Demo tour, step ${state.step + 1} of ${TOUR_STEPS.length}`}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] mx-auto max-w-md rounded-[1.5rem] border border-line-strong bg-surface/95 p-4 text-ink shadow-2xl backdrop-blur-xl md:inset-x-auto md:w-[26rem]",
          dockLeft ? "md:left-6" : "md:right-6",
          dockTop ? "md:top-24 md:bottom-auto" : "md:bottom-6",
        )}
        data-testid="tour-card"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[0.68rem] font-bold text-accent-ink">
            {state.step + 1}/{TOUR_STEPS.length}
          </span>
          <span className="font-mono text-[0.68rem] tracking-[0.15em] text-ink-3 uppercase">{step.kicker}</span>
          <span
            className={cn("ml-auto inline-flex items-center gap-1 font-mono text-xs", elapsed > TOUR_BUDGET_SECONDS ? "text-danger" : "text-ink-3")}
            title="Elapsed / 5-minute budget"
          >
            <Timer className="size-3.5" /> {mmss(elapsed)} / 5:00
          </span>
          <button type="button" onClick={() => write(null)} aria-label="End tour" className="grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div className="h-full bg-accent" animate={{ width: `${((state.step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
            <h2 className="mt-3 font-display text-xl leading-tight font-extrabold">{step.title}</h2>
            <p className="mt-1.5 text-sm text-ink-2">{step.body}</p>
            {step.try && onRoute ? (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-sticker px-3 py-2 text-sm font-semibold text-[#16120f]">
                <Hand className="mt-0.5 size-4 shrink-0" /> Try it: {step.try}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(state.step - 1)}
            disabled={state.step === 0}
            className="grid size-11 place-items-center rounded-full border border-line-strong disabled:opacity-40"
            aria-label="Previous step"
          >
            <ArrowLeft className="size-4" />
          </button>
          {!onRoute ? (
            <button type="button" onClick={() => router.push(step.route)} className="h-11 flex-1 rounded-full border border-line-strong text-sm font-semibold">
              Back to this step
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => go(state.step + 1)}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-accent-ink"
            data-testid="tour-next"
          >
            {last ? "Finish" : "Next"} <ArrowRight className="size-4" />
          </button>
        </div>
        <p className="mt-2 hidden text-center text-[0.68rem] text-ink-3 md:block">← → to navigate · Esc to exit</p>
      </motion.aside>
    </>
  );
}
