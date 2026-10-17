"use client";

import { Check, FlaskConical, Undo2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { endAuctionNowAction } from "@/features/demo/actions";
import { cancelDibsAction } from "@/features/dibs/actions";
import type { ListingStatus, SaleMode } from "@/data/types";
import { setListingStatusAction } from "../actions";

export function SellerControls({
  campus,
  listingId,
  status,
  saleMode,
  bidCount,
  settled,
  activeDib,
  demoTools,
}: {
  campus: string;
  listingId: string;
  status: ListingStatus;
  saleMode: SaleMode;
  bidCount: number;
  settled: boolean;
  activeDib: { id: string; buyerName: string } | null;
  demoTools: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.message ?? "That didn't work");
      else toast.success(success);
      router.refresh();
    });

  return (
    <div className="rounded-[1.4rem] border border-dashed border-line-strong p-4" data-testid="seller-controls">
      <p className="mb-3 font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">Seller controls</p>
      {activeDib ? (
        <div className="mb-3 rounded-xl bg-surface-2 p-3 text-sm">
          <strong>{activeDib.buyerName}</strong> called dibs. Schedule the pickup and confirm payment in Handoffs.
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/${campus}/x/handoffs`} className={buttonVariants({ size: "sm" })}>
              <Check /> Open handoff
            </Link>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelDibsAction(campus, activeDib.id), "Reservation released")}>
              <X /> Release
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {saleMode !== "auction" && status === "active" ? (
          <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => setListingStatusAction(campus, listingId, "sold"), "Marked as sold")}>
            <Check /> Mark sold
          </Button>
        ) : null}
        {status === "active" || status === "reserved" ? (
          <Button
            size="sm"
            variant="danger"
            disabled={pending || (saleMode === "auction" && bidCount > 0)}
            title={saleMode === "auction" && bidCount > 0 ? "Auctions with bids can't be cancelled" : undefined}
            onClick={() => run(() => setListingStatusAction(campus, listingId, "cancelled"), "Listing cancelled")}
          >
            <X /> Cancel listing
          </Button>
        ) : null}
        {status === "cancelled" && saleMode !== "auction" ? (
          <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => setListingStatusAction(campus, listingId, "active"), "Relisted")}>
            <Undo2 /> Relist
          </Button>
        ) : null}
      </div>
      {saleMode === "auction" && bidCount > 0 && !settled ? (
        <p className="mt-2 text-xs text-ink-3">Auction terms are locked once bidding starts, and it can&apos;t be cancelled.</p>
      ) : null}
      {demoTools && saleMode === "auction" && !settled && status === "active" ? (
        <DemoEndAuction listingId={listingId} />
      ) : null}
    </div>
  );
}

export function DemoEndAuction({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-3"
      disabled={pending}
      data-testid="demo-end-auction"
      onClick={() =>
        start(async () => {
          const r = await endAuctionNowAction(listingId);
          if (!r.ok) toast.error(r.message);
          else toast("Auction settled (demo)", { description: "Deadline moved to now and settlement ran." });
          router.refresh();
        })
      }
    >
      <FlaskConical /> Demo: end auction now
    </Button>
  );
}
