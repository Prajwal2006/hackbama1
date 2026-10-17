import { ArrowRight, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { randomInt } from "node:crypto";
import { EmptyState } from "@/components/ui/misc";
import { CreateListingForm } from "@/features/listings/components/CreateListingForm";
import { requireMember } from "@/lib/campus";
import { storageMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sell something" };

export default async function CreatePage({ params }: PageProps<"/[campus]/create">) {
  const slug = (await params).campus;
  const { campus, isMember } = await requireMember(slug, `/${slug}/create`);
  return (
    <div className="mx-auto max-w-5xl">
      <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">New listing · {campus.shortName}</p>
      <h1 className="mb-8 font-display text-fluid-xl font-extrabold">
        Clear the room. <span className="text-accent">Make someone&apos;s semester.</span>
      </h1>
      {isMember ? (
        <>
          <Link
            href={`/${campus.slug}/x/bank`}
            className="mb-6 flex items-center gap-4 rounded-[1.5rem] border border-dashed border-accent/60 bg-accent/5 p-4 transition-colors hover:bg-accent/10"
            data-testid="bank-callout"
          >
            <Warehouse className="size-8 shrink-0 text-accent" />
            <span className="flex-1">
              <strong className="font-display text-lg">Furniture and leaving soon?</strong>
              <span className="block text-sm text-ink-2">Deposit it in the Furniture Bank instead — it&apos;s stored over the summer and sold to a student moving in next semester.</span>
            </span>
            <ArrowRight className="size-5 text-ink-3" />
          </Link>
          <CreateListingForm campus={campus.slug} spots={campus.pickupSpots} seed={randomInt(360)} />
          {storageMode === "mock" ? (
            <p className="mt-6 text-xs text-ink-3">Demo storage: photos are resized in your browser and kept in server memory only.</p>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={`Only ${campus.shortName} students can list here`}
          body="Listings belong to the campus you're verified at. Switch to your home campus to post."
        />
      )}
    </div>
  );
}
