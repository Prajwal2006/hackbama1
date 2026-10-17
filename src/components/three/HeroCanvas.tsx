"use client";

import dynamic from "next/dynamic";
import { ItemArt } from "@/components/art/ItemArt";

/** Static fallback: the same objects as flat illustrations, arranged like the 3D scene. */
export function HeroFallback() {
  const items = [
    { c: "fridge", s: 20, cls: "right-[12%] top-[18%] w-40 rotate-6" },
    { c: "lamp", s: 80, cls: "left-[8%] top-[10%] w-32 -rotate-6" },
    { c: "other", s: 140, cls: "left-[36%] bottom-[8%] w-36 rotate-3" },
    { c: "plant", s: 200, cls: "right-[2%] bottom-[12%] w-28 -rotate-3" },
  ] as const;
  return (
    <div className="relative h-full w-full" aria-hidden>
      {items.map((i) => (
        <div key={i.c} className={`absolute aspect-square overflow-hidden rounded-[1.5rem] border border-line shadow-card ${i.cls}`}>
          <ItemArt category={i.c} seed={i.s} />
        </div>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <div className="grid h-full w-full place-items-center" aria-hidden>
      <div className="size-40 animate-pulse rounded-full bg-[radial-gradient(circle,var(--glow),transparent_70%)]" />
    </div>
  );
}

const Scene = dynamic(
  async () => {
    const [{ Scene3D }, { DormScene }] = await Promise.all([import("./Scene3D"), import("./DormScene")]);
    function HeroScene() {
      return (
        <Scene3D className="h-full w-full" fallback={<HeroFallback />}>
          {(q) => <DormScene quality={q} accent="#e0243c" />}
        </Scene3D>
      );
    }
    return HeroScene;
  },
  { ssr: false, loading: Loading },
);

export function HeroCanvas({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Scene />
    </div>
  );
}
