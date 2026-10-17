/**
 * Feature registry — the contract between the core team and feature branches.
 *
 * The sidebar, mobile tab bar, command palette and "coming soon" module pages
 * are all generated from this list. To ship a module from a feature branch:
 *   1. Add (or flip) its entry here — keep the `id` stable.
 *   2. Build it in `src/features/<id>/` (components, actions, README).
 *   3. Add its route under `src/app/[campus]/(app)/<route>/page.tsx`.
 *   4. Set `status: "live"`. Until then the generic module page renders.
 * Owners are informational; merge conflicts should be limited to your entry.
 */
import type { CampusSlug } from "./campuses";

export type FeatureStatus = "live" | "beta" | "planned";
export type FeatureOwner = "core" | "dev-a" | "dev-b";
export type FeatureGroup = "market" | "you" | "labs";

/** Icon names map to Lucide components in `src/components/shell/icons.tsx`. */
export type FeatureIcon =
  | "home" | "search" | "plus" | "user" | "bell" | "gavel" | "gift"
  | "repeat" | "layers" | "box" | "wallet" | "car" | "plane" | "utensils" | "calendar";

export type Feature = {
  id: string;
  title: string;
  /** One line, shown in the palette and on module pages. */
  blurb: string;
  icon: FeatureIcon;
  /** Path relative to the campus root, e.g. "browse" → /ua/browse. "" = campus home. */
  route: string;
  status: FeatureStatus;
  owner: FeatureOwner;
  group: FeatureGroup;
  /** Placement in navigation. */
  nav: { sidebar: boolean; mobileTab?: number; palette: boolean };
  /** Requires a signed-in, campus-verified student. */
  requiresAuth?: boolean;
  /** Limit to specific campuses; omitted = all campuses. */
  campuses?: CampusSlug[];
  /** Extra palette search terms. */
  keywords?: string[];
};

export const FEATURES: Feature[] = [
  // ——— Core marketplace (built in the foundation) ———
  { id: "home", title: "Home", blurb: "What's moving on campus right now.", icon: "home", route: "",
    status: "live", owner: "core", group: "market", nav: { sidebar: true, mobileTab: 0, palette: true } },
  { id: "browse", title: "Browse", blurb: "Search every listing, filter by hall, price and mode.", icon: "search", route: "browse",
    status: "live", owner: "core", group: "market", nav: { sidebar: true, mobileTab: 1, palette: true }, keywords: ["search", "find"] },
  { id: "auctions", title: "Live auctions", blurb: "Bid against other students before the clock runs out.", icon: "gavel", route: "browse?mode=auction&sort=ending_soon",
    status: "live", owner: "core", group: "market", nav: { sidebar: true, palette: true }, keywords: ["bid"] },
  { id: "free", title: "Free stuff", blurb: "Zero dollars. Just call dibs.", icon: "gift", route: "browse?mode=free",
    status: "live", owner: "core", group: "market", nav: { sidebar: true, palette: true }, keywords: ["giveaway"] },
  { id: "create", title: "Sell something", blurb: "Post a fixed-price, free, or auction listing.", icon: "plus", route: "create",
    status: "live", owner: "core", group: "market", nav: { sidebar: true, mobileTab: 2, palette: true }, requiresAuth: true,
    keywords: ["post", "list", "sell"] },
  { id: "notifications", title: "Activity", blurb: "Outbids, wins, and reservations.", icon: "bell", route: "notifications",
    status: "live", owner: "core", group: "you", nav: { sidebar: true, mobileTab: 3, palette: true }, requiresAuth: true },
  { id: "me", title: "My Dibs", blurb: "Your listings, bids, reservations and saves.", icon: "user", route: "me",
    status: "live", owner: "core", group: "you", nav: { sidebar: true, mobileTab: 4, palette: true }, requiresAuth: true,
    keywords: ["profile", "account", "bids", "saved"] },

  // ——— Future modules (split between dev-a and dev-b) ———
  { id: "swipe", title: "Swipe", blurb: "Flick through listings: right to save, left to skip.", icon: "layers", route: "x/swipe",
    status: "beta", owner: "dev-a", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["discover", "tinder"] },
  { id: "handoffs", title: "Handoffs", blurb: "Move-out / move-in pickup scheduling with hall time slots.", icon: "calendar", route: "x/handoffs",
    status: "planned", owner: "dev-a", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["pickup", "schedule", "move-in"] },
  { id: "room-fit", title: "Room Fit", blurb: "Drop listings into a 3D model of your dorm to see if they fit.", icon: "box", route: "x/room-fit",
    status: "planned", owner: "dev-a", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["3d", "measure"] },
  { id: "subs", title: "Split subs", blurb: "Find people to split streaming and software plans.", icon: "wallet", route: "x/subs",
    status: "planned", owner: "dev-b", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["subscription"] },
  { id: "rides", title: "Rides & trips", blurb: "Share a ride home at move-out or group up for break trips.", icon: "car", route: "x/rides",
    status: "planned", owner: "dev-b", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["carpool", "travel"] },
  { id: "meals", title: "Meal share", blurb: "Trade spare meal swipes and dining dollars.", icon: "utensils", route: "x/meals",
    status: "planned", owner: "dev-b", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["swipes", "dining"] },
  { id: "class-swap", title: "Class swap", blurb: "Match with someone who has the section you want.", icon: "repeat", route: "x/class-swap",
    status: "planned", owner: "dev-b", group: "labs", nav: { sidebar: true, palette: true }, keywords: ["schedule", "section"] },
];

export function featuresFor(campus: string) {
  return FEATURES.filter((f) => !f.campuses || (f.campuses as string[]).includes(campus));
}

export function featureHref(campus: string, f: Feature) {
  return f.route ? `/${campus}/${f.route}` : `/${campus}`;
}

export function mobileTabs(campus: string) {
  return featuresFor(campus)
    .filter((f) => f.nav.mobileTab !== undefined)
    .sort((a, b) => a.nav.mobileTab! - b.nav.mobileTab!);
}

export function getFeatureByModuleSlug(slug: string) {
  return FEATURES.find((f) => f.route === `x/${slug}`);
}
