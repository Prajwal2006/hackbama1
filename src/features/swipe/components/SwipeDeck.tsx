"use client";

import { Heart, RotateCcw, X } from "lucide-react";
import { motion, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ItemArt } from "@/components/art/ItemArt";
import { Stack } from "@/components/reactbits/Stack";
import { Button } from "@/components/ui/button";
import type { Category } from "@/data/types";
import { toggleSaveAction } from "@/features/listings/actions";

export type SwipeCard = {
  id: string;
  title: string;
  priceLabel: string;
  meta: string;
  category: Category;
  artSeed: number;
  image: string | null;
};

export function SwipeDeck({ campus, cards, signedIn }: { campus: string; cards: SwipeCard[]; signedIn: boolean }) {
  const router = useRouter();
  const [deck, setDeck] = useState(cards);
  const [saved, setSaved] = useState(0);

  const decide = async (id: string, dir: "left" | "right") => {
    setDeck((d) => d.filter((c) => c.id !== id));
    if (dir !== "right") return;
    if (!signedIn) {
      toast("Sign in to keep your saves", { action: { label: "Sign in", onClick: () => router.push(`/${campus}/signin?next=/${campus}/x/swipe`) } });
      return;
    }
    const r = await toggleSaveAction(campus, id);
    if (r.ok && r.data.saved) setSaved((n) => n + 1);
    else if (!r.ok) toast.error(r.message);
  };

  const top = deck[0];

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center">
      <Stack
        className="aspect-[3/4] h-[min(52dvh,30rem)] max-w-full"
        items={deck.map((c) => ({
          id: c.id,
          content: (
            <div className="h-full w-full overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-card select-none">
              <div className="h-[72%] overflow-hidden">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <ItemArt category={c.category} seed={c.artSeed} />
                )}
              </div>
              <div className="p-4">
                <p className="font-mono text-lg font-bold text-accent">{c.priceLabel}</p>
                <p className="line-clamp-2 font-display text-xl leading-tight font-extrabold">{c.title}</p>
                <p className="mt-1 text-sm text-ink-3">{c.meta}</p>
              </div>
            </div>
          ),
        }))}
        onFling={(it, dir) => decide(it.id, dir)}
        overlay={(x) => <Overlay x={x} />}
      />
      {top ? (
        <div className="mt-8 flex items-center gap-5">
          <Button variant="outline" size="icon" className="size-16" aria-label={`Skip ${top.title}`} onClick={() => decide(top.id, "left")}>
            <X className="!size-7" />
          </Button>
          <Link href={`/${campus}/listing/${top.id}`} className="text-sm font-semibold text-ink-2 underline-offset-4 hover:underline">
            Details
          </Link>
          <Button size="icon" className="size-16" aria-label={`Save ${top.title}`} onClick={() => decide(top.id, "right")}>
            <Heart className="!size-7" />
          </Button>
        </div>
      ) : (
        <div className="absolute mt-24 text-center">
          <span className="stamp text-3xl">that&apos;s all</span>
          <p className="mt-5 text-ink-2">You saved {saved} {saved === 1 ? "thing" : "things"}.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => setDeck(cards)}>
              <RotateCcw /> Start over
            </Button>
            <Link href={`/${campus}/me?tab=saved`} className="inline-flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink">
              See saved
            </Link>
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-ink-3">Drag the card, or use the buttons. Right saves to your profile.</p>
    </div>
  );
}

function Overlay({ x }: { x: MotionValue<number> }) {
  const save = useTransform(x, [20, 120], [0, 1]);
  const skip = useTransform(x, [-120, -20], [1, 0]);
  return (
    <>
      <motion.span style={{ opacity: save }} className="stamp pointer-events-none absolute top-6 left-6 bg-bg/70 text-3xl text-success">save</motion.span>
      <motion.span style={{ opacity: skip }} className="stamp pointer-events-none absolute top-6 right-6 rotate-[8deg] bg-bg/70 text-3xl text-ink-2">nope</motion.span>
    </>
  );
}
