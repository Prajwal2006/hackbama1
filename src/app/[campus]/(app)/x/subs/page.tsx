import type { Metadata } from "next";
import { CommunityBoard } from "@/features/community/CommunityBoard";

export const metadata: Metadata = { title: "Split subscriptions" };

export default async function SubsPage({ params }: PageProps<"/[campus]/x/subs">) {
  return (
    <CommunityBoard
      campusSlug={(await params).campus}
      kind="sub"
      kicker="Labs · split subs"
      title="Split the family plan."
      intro="Family and group plans are cheaper per person — if you can find the people. Post the seats you have open; verified students at your campus join and pay their share."
      points={["Organizer posts the plan and open seats", "Dibs splits the price evenly, owner included", "Members mark paid, organizer confirms"]}
    />
  );
}
