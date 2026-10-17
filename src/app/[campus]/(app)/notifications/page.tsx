import { Bell, Clock, Gavel, Hand, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/misc";
import { getRepo } from "@/data";
import type { NotificationKind } from "@/data/types";
import { MarkAllRead } from "@/features/notifications/components/MarkAllRead";
import { requireMember } from "@/lib/campus";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

const ICON: Record<NotificationKind, typeof Bell> = {
  outbid: Gavel, bid_received: Gavel, auction_won: Trophy, auction_sold: Trophy, auction_lost: Gavel,
  auction_unsold: Clock, dibs_confirmed: Hand, dibs_received: Hand, dibs_expired: Clock,
};

export default async function NotificationsPage({ params }: PageProps<"/[campus]/notifications">) {
  const slug = (await params).campus;
  const { viewer } = await requireMember(slug, `/${slug}/notifications`);
  const items = await getRepo().listNotifications(viewer.actor);
  const unread = items.filter((n) => !n.readAt).length;
  const now = new Date();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-ink-3 uppercase">In-app only</p>
          <h1 className="font-display text-fluid-xl font-extrabold">Activity</h1>
        </div>
        {unread ? <MarkAllRead campus={slug} /> : null}
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-2" data-testid="notifications">
          {items.map((n) => {
            const Icon = ICON[n.kind] ?? Bell;
            const good = n.kind === "auction_won" || n.kind === "dibs_confirmed" || n.kind === "auction_sold";
            const body = (
              <div className={cn("flex gap-3 rounded-2xl border p-4 transition-colors", n.readAt ? "border-line" : "border-line-strong bg-surface")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", good ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2")}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">
                    {n.title}
                    {!n.readAt ? <span className="size-2 rounded-full bg-accent" aria-label="unread" /> : null}
                  </p>
                  <p className="text-sm text-ink-2">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-3">{relativeTime(n.createdAt, now)}</span>
              </div>
            );
            return (
              <li key={n.id}>
                {n.listingId ? <Link href={`/${n.campusId}/listing/${n.listingId}`}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="All quiet" body="Outbids, wins and reservations will show up here." />
      )}
    </div>
  );
}
