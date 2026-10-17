import type { Metadata } from "next";
import { CommunityBoard } from "@/features/community/CommunityBoard";

export const metadata: Metadata = { title: "Rides & trips" };

export default async function RidesPage({ params }: PageProps<"/[campus]/x/rides">) {
  return (
    <CommunityBoard
      campusSlug={(await params).campus}
      kind="ride"
      kicker="Labs · rides & trips"
      title="Carpool home. Split the beach house."
      intro="Driving to the airport at move-out, or planning a break trip? Publish it, set seats and a fair share, and let verified students grab a spot."
      points={["Post a ride or a whole trip", "Grab seats — no overbooking, ever", "Riders mark paid, driver confirms"]}
    />
  );
}
