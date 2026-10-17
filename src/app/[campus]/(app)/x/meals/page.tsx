import type { Metadata } from "next";
import { CommunityBoard } from "@/features/community/CommunityBoard";

export const metadata: Metadata = { title: "Meal share" };

export default async function MealsPage({ params }: PageProps<"/[campus]/x/meals">) {
  return (
    <CommunityBoard
      campusSlug={(await params).campus}
      kind="meal"
      kicker="Labs · off-campus meal plan"
      title="Cook once, feed the floor."
      intro="Students in off-campus apartments who love to cook make big batches; everyone else claims a portion for a few bucks — or a trade. A home-cooked meal plan without the dining-hall meal plan."
      points={["Cooks post a batch from their off-campus kitchen", "Claim portions (or offer a trade)", "Pay the cook your way, both confirm"]}
    />
  );
}
