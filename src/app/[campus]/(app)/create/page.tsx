import type { Metadata } from "next";
import { randomInt } from "node:crypto";
import { EmptyState } from "@/components/ui/misc";
import { CreateListingForm } from "@/features/listings/components/CreateListingForm";
import { requireMember } from "@/lib/campus";
import { arScanEnabled, storageMode } from "@/lib/env";

// Turning photos into a 3D model calls Gemini from a server action on this page (usually 3-15 s).
export const maxDuration = 60;

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
          <CreateListingForm campus={campus.slug} spots={campus.pickupSpots} seed={randomInt(360)} arEnabled={arScanEnabled} />
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
