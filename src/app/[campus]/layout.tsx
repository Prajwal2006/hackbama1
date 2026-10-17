import type { Metadata } from "next";
import { getCampus } from "@/config/campuses";
import { resolveCampus } from "@/lib/campus";

export async function generateMetadata({ params }: LayoutProps<"/[campus]">): Promise<Metadata> {
  const campus = getCampus((await params).campus);
  if (!campus) return {};
  return {
    title: { default: `${campus.shortName} marketplace`, template: `%s · Dibs ${campus.shortName}` },
    description: `Move-out marketplace for verified ${campus.name} students. Fixed price, auctions, and free stuff.`,
  };
}

export default async function CampusLayout({ children, params }: LayoutProps<"/[campus]">) {
  resolveCampus((await params).campus);
  return children;
}
