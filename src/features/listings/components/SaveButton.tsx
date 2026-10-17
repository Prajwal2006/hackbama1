"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSaveAction } from "../actions";

export function SaveButton({
  campus,
  listingId,
  saved,
  signedIn,
  className,
  size = "md",
}: {
  campus: string;
  listingId: string;
  saved: boolean;
  signedIn: boolean;
  className?: string;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Unsave" : "Save"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          router.push(`/${campus}/signin?next=${encodeURIComponent(`/${campus}/listing/${listingId}`)}`);
          return;
        }
        start(async () => {
          setOptimistic(!optimistic);
          const r = await toggleSaveAction(campus, listingId);
          if (!r.ok) toast.error(r.message);
          router.refresh();
        });
      }}
      className={cn(
        "grid place-items-center rounded-full bg-bg/80 text-ink backdrop-blur-md transition-colors hover:bg-bg",
        size === "lg" ? "size-12" : "size-11",
        className,
      )}
    >
      <motion.span key={String(optimistic)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
        <Heart className={cn("size-5", optimistic && "fill-accent text-accent")} />
      </motion.span>
    </button>
  );
}
