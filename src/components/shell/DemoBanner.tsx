"use client";

import { FlaskConical, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { resetDemoAction } from "@/features/demo/actions";

/** Always-visible indicator that data and verification are simulated. */
export function DemoBanner({ dataMode, emailDelivery, canReset }: { dataMode: "mock" | "neon"; emailDelivery: "email" | "screen"; canReset: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const parts = [dataMode === "mock" && "in-memory data", emailDelivery === "screen" && "sign-in codes shown on screen"].filter(Boolean);
  return (
    <div className="flex items-center justify-center gap-2 border-b border-line bg-sticker px-safe py-1.5 text-[0.78rem] font-semibold text-[#16120f]">
      <FlaskConical className="size-3.5 shrink-0" />
      <span className="truncate">
        Demo mode — {parts.join(" + ")}; actions are real in this sandbox.
      </span>
      <Link href="/demo" className="ml-1 hidden shrink-0 underline underline-offset-2 sm:inline">Guided tour</Link>
      {canReset ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await resetDemoAction();
              toast.success("Demo data reset", { description: "Fresh seed: 30 listings, live auctions, clean slate." });
              router.refresh();
            })
          }
          className="ml-1 inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full bg-[#16120f] px-2.5 text-[0.72rem] text-[#ffd23f] disabled:opacity-60"
        >
          <RotateCcw className={pending ? "size-3 animate-spin" : "size-3"} /> Reset
        </button>
      ) : null}
    </div>
  );
}
