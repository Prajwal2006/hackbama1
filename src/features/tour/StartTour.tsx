"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { prepareTourAction } from "@/features/demo/actions";
import { startTourClient } from "./TourOverlay";
import { TOUR_STEPS } from "./steps";

export function StartTour() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      data-testid="start-tour"
      onClick={() =>
        start(async () => {
          const r = await prepareTourAction();
          if (!r.ok) {
            toast.error(r.message);
            return;
          }
          startTourClient();
          router.push(TOUR_STEPS[0].route);
        })
      }
      className="group inline-flex h-16 items-center gap-3 rounded-full bg-accent pr-8 pl-3 text-xl font-bold text-accent-ink shadow-[0_18px_40px_-18px_var(--accent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60"
    >
      <span className="grid size-11 place-items-center rounded-full bg-accent-ink text-accent">
        <Play className="size-5 fill-current" />
      </span>
      {pending ? "Setting the stage…" : "Start the 5-minute tour"}
    </button>
  );
}
