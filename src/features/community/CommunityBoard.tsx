import { HandCoins } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { getCommunity } from "@/data";
import type { PostKind } from "@/data/community-types";
import { loadCampusContext } from "@/lib/campus";
import { canTransact } from "@/lib/policy";
import { formatInZone } from "@/lib/time";
import { CreatePostForm } from "./components/CreatePostForm";
import { PostCard, type PostCardData } from "./components/PostCard";

/** Shared server page for the subs / rides / meals boards. Each module's route renders this with its copy. */
export async function CommunityBoard({
  campusSlug,
  kind,
  kicker,
  title,
  intro,
  points,
}: {
  campusSlug: string;
  kind: PostKind;
  kicker: string;
  title: string;
  intro: string;
  points: string[];
}) {
  const { campus, viewer } = await loadCampusContext(campusSlug);
  const posts = await getCommunity().listPosts(campus.slug, kind);
  const me = viewer?.actor.userId ?? null;

  const cards: PostCardData[] = posts.map((p) => {
    const mine = me ? p.members.find((m) => m.userId === me) : undefined;
    return {
      id: p.id,
      kind: p.kind,
      title: p.title,
      body: p.body,
      ownerName: p.ownerName,
      capacity: p.capacity,
      taken: p.taken,
      unitPriceCents: p.unitPriceCents,
      whenLabel:
        p.kind === "sub"
          ? `Running since ${formatInZone(p.startsAt, campus.timezone, { weekday: undefined, hour: undefined, minute: undefined })}`
          : formatInZone(p.startsAt, campus.timezone),
      imageUrl: p.imageUrl,
      status: p.status,
      data: p.data as Record<string, unknown>,
      isOwner: p.ownerId === me,
      signedIn: !!viewer,
      canJoin: !!viewer && canTransact(viewer.actor, p.campusId),
      mine: mine
        ? {
            id: mine.id,
            quantity: mine.quantity,
            paymentMethod: mine.paymentMethod,
            paymentSentAt: mine.paymentSentAt?.toISOString() ?? null,
            paymentReceivedAt: mine.paymentReceivedAt?.toISOString() ?? null,
          }
        : null,
      // Only the organizer sees who's in and their payment status.
      members:
        p.ownerId === me
          ? p.members.map((m) => ({
              id: m.id,
              name: m.userName,
              quantity: m.quantity,
              paymentMethod: m.paymentMethod,
              paymentSentAt: m.paymentSentAt?.toISOString() ?? null,
              paymentReceivedAt: m.paymentReceivedAt?.toISOString() ?? null,
            }))
          : [],
    };
  });
  // Your own posts and memberships first.
  cards.sort((a, b) => Number(b.isOwner || !!b.mine) - Number(a.isOwner || !!a.mine));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">{kicker}</p>
          <h1 className="font-display text-fluid-xl font-extrabold">{title}</h1>
          <p className="mt-2 text-ink-2">{intro}</p>
        </div>
        {viewer && viewer.actor.campusId === campus.slug ? (
          <CreatePostForm campus={campus.slug} kind={kind} spots={campus.pickupSpots.map((s) => s.name)} />
        ) : null}
      </div>
      <ul className="mt-5 grid gap-2 text-sm text-ink-2 sm:grid-cols-3">
        {points.map((pt, i) => (
          <li key={pt} className="flex gap-2 rounded-2xl border border-line p-3">
            <span className="font-mono text-accent">0{i + 1}</span> {pt}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        <HandCoins className="size-3.5" /> Money moves in Venmo, Zelle, Cash App, or cash — Dibs just records who sent and who received.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-tour={`board-${kind}`}>
        {cards.length ? (
          cards.map((c) => <PostCard key={c.id} campus={campus.slug} p={c} />)
        ) : (
          <EmptyState className="md:col-span-2 xl:col-span-3" title="Nothing here yet" body="Be the first to post one." />
        )}
      </div>
    </div>
  );
}
