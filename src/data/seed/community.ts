/** Deterministic seed for handoffs and the community modules. Times are relative to `now`. */
import type { CommunityMember, CommunityPost, Handoff, SwapCycle, SwapRequest } from "../community-types";
import type { Listing } from "../types";

export type CommunitySeed = {
  handoffs: Handoff[];
  posts: CommunityPost[];
  members: CommunityMember[];
  swaps: SwapRequest[];
  cycles: SwapCycle[];
};

const H = 3_600_000;

export function buildCommunitySeed(now: Date, listings: Listing[]): CommunitySeed {
  const t = (h: number) => new Date(now.getTime() + h * H);
  const price = (id: string) => listings.find((l) => l.id === id)?.priceCents ?? 0;
  const ack = { paymentMethod: null, paymentSentAt: null, paymentReceivedAt: null };

  const handoffs: Handoff[] = [
    {
      id: "ho_ua_monitor", campusId: "ua", listingId: "lst_ua_monitor", sellerId: "usr_ua_jordan", buyerId: "usr_ua_demo",
      source: "dibs", dibId: "dib_ua_monitor", amountCents: price("lst_ua_monitor"), phase: "move_out", scheduledAt: null,
      status: "pending", completedAt: null, ...ack, createdAt: t(-5), updatedAt: t(-5),
    },
    {
      id: "ho_ua_kettle", campusId: "ua", listingId: "lst_ua_kettle", sellerId: "usr_ua_demo", buyerId: "usr_ua_maya",
      source: "dibs", dibId: "dib_ua_kettle", amountCents: price("lst_ua_kettle"), phase: "move_out", scheduledAt: t(20),
      status: "pending", completedAt: null, paymentMethod: "Venmo", paymentSentAt: t(-0.6), paymentReceivedAt: null,
      createdAt: t(-3), updatedAt: t(-0.6),
    },
    {
      id: "ho_ua_bike", campusId: "ua", listingId: "lst_ua_bike", sellerId: "usr_ua_dev", buyerId: "usr_ua_jordan",
      source: "auction", dibId: null, amountCents: 8500, phase: "move_out", scheduledAt: t(-18),
      status: "completed", completedAt: t(-17), paymentMethod: "Zelle", paymentSentAt: t(-18.5), paymentReceivedAt: t(-18),
      createdAt: t(-20), updatedAt: t(-17),
    },
    {
      id: "ho_rb_kayak", campusId: "riverbend", listingId: "lst_rb_kayak", sellerId: "usr_rb_ivy", buyerId: "usr_rb_lena",
      source: "auction", dibId: null, amountCents: 10000, phase: "move_out", scheduledAt: t(26),
      status: "pending", completedAt: null, ...ack, createdAt: t(-12), updatedAt: t(-12),
    },
  ];

  let n = 0;
  const posts: CommunityPost[] = [];
  const members: CommunityMember[] = [];
  const post = (
    p: Omit<CommunityPost, "status" | "createdAt" | "updatedAt" | "body"> & { body?: string },
    joiners: [string, number?, ("sent" | "received")?][] = [],
    ageH = 24,
  ) => {
    posts.push({ body: "", status: "open", createdAt: t(-ageH), updatedAt: t(-ageH), ...p });
    for (const [userId, quantity = 1, paid] of joiners) {
      members.push({
        id: `mem_${++n}`, postId: p.id, campusId: p.campusId, userId, quantity, status: "joined",
        paymentMethod: paid ? "Venmo" : null,
        paymentSentAt: paid ? t(-ageH / 2) : null,
        paymentReceivedAt: paid === "received" ? t(-ageH / 3) : null,
        createdAt: t(-ageH + 1), updatedAt: t(-ageH + 1),
      });
    }
    const taken = members.filter((m) => m.postId === p.id).reduce((s, m) => s + m.quantity, 0);
    if (taken >= p.capacity) posts[posts.length - 1].status = "full";
  };

  // ——— Subscriptions ———
  post({ id: "pst_sub_spotify", campusId: "ua", kind: "sub", ownerId: "usr_ua_maya", title: "Spotify Premium Family — 2 spots open",
    body: "I'm the plan manager. Same address required by Spotify, so you'll use our off-campus house address.", capacity: 5, unitPriceCents: 333,
    startsAt: t(-24 * 40), imageUrl: null, data: { service: "Spotify Premium Family", cycle: "monthly", totalCents: 1999 } },
    [["usr_ua_jordan", 1, "received"], ["usr_ua_priya", 1, "received"], ["usr_ua_cole", 1, "sent"]], 24 * 6);
  post({ id: "pst_sub_youtube", campusId: "ua", kind: "sub", ownerId: "usr_ua_ana", title: "YouTube Premium Family",
    body: "Ad-free YouTube + Music. Splitting six ways.", capacity: 5, unitPriceCents: 384, startsAt: t(-24 * 10), imageUrl: null,
    data: { service: "YouTube Premium Family", cycle: "monthly", totalCents: 2299 } }, [["usr_ua_dev", 1, "received"]], 24 * 3);
  post({ id: "pst_sub_m365", campusId: "ua", kind: "sub", ownerId: "usr_ua_dev", title: "Microsoft 365 Family (1TB each)",
    body: "Yearly plan, 6 people. Great for backing up class files.", capacity: 5, unitPriceCents: 1667, startsAt: t(-24 * 60), imageUrl: null,
    data: { service: "Microsoft 365 Family", cycle: "yearly", totalCents: 9999 } },
    [["usr_ua_maya", 1, "received"], ["usr_ua_ana", 1, "received"], ["usr_ua_priya", 1, "received"], ["usr_ua_cole", 1]], 24 * 9);
  post({ id: "pst_sub_rb", campusId: "riverbend", kind: "sub", ownerId: "usr_rb_sam", title: "Streaming bundle — 1 seat",
    capacity: 3, unitPriceCents: 500, startsAt: t(-24 * 5), imageUrl: null, data: { service: "Streaming bundle", cycle: "monthly", totalCents: 2000 } },
    [["usr_rb_ivy", 1, "received"], ["usr_rb_theo", 1, "sent"]], 24 * 4);

  // ——— Rides & trips ———
  post({ id: "pst_ride_atl", campusId: "ua", kind: "ride", ownerId: "usr_ua_priya", title: "Tuscaloosa → Atlanta airport (ATL)",
    body: "Leaving right after my last final. Trunk fits two big suitcases + a mini-fridge if you're lucky.", capacity: 3, unitPriceCents: 2500,
    startsAt: t(24 * 3 + 5), imageUrl: "/photos/ride_hatchback.jpg",
    data: { from: "Ferguson Student Center", to: "ATL Airport", trip: false, returnAt: null, luggage: "2 large bags" } },
    [["usr_ua_ana"]], 30);
  post({ id: "pst_ride_bhm", campusId: "ua", kind: "ride", ownerId: "usr_ua_jordan", title: "BHM airport run, early flight",
    capacity: 2, unitPriceCents: 1500, startsAt: t(40), imageUrl: null,
    data: { from: "Presidential Village", to: "Birmingham (BHM)", trip: false, returnAt: null, luggage: "carry-on only" } }, [], 10);
  post({ id: "pst_trip_gulf", campusId: "ua", kind: "ride", ownerId: "usr_ua_cole", title: "Spring break: Gulf Shores beach house",
    body: "Splitting a 4-bedroom rental + gas. Two spots left. Vibes: beach, grill, zero homework.", capacity: 5, unitPriceCents: 14500,
    startsAt: t(24 * 21), imageUrl: "/photos/ride_van.jpg",
    data: { from: "Bryce Lawn lot", to: "Gulf Shores, AL", trip: true, returnAt: t(24 * 26).toISOString(), luggage: "beach stuff" } },
    [["usr_ua_maya", 1, "received"], ["usr_ua_dev", 2, "sent"]], 48);
  post({ id: "pst_ride_rb", campusId: "riverbend", kind: "ride", ownerId: "usr_rb_theo", title: "Riverbend → city station",
    capacity: 3, unitPriceCents: 800, startsAt: t(20), imageUrl: null,
    data: { from: "Lot C", to: "City train station", trip: false, returnAt: null, luggage: null } }, [["usr_rb_ivy"]], 6);

  // ——— Meal share ———
  post({ id: "pst_meal_curry", campusId: "ua", kind: "meal", ownerId: "usr_ua_ana", title: "Butter chicken + basmati, 8 portions",
    body: "Big batch Sunday. Bring a container or grab one of mine.", capacity: 8, unitPriceCents: 500, startsAt: t(6),
    imageUrl: "/photos/meal_curry.jpg", data: { dish: "Butter chicken", dietary: ["halal", "gluten-free"], pickupSpot: "The Lark Tuscaloosa", trade: null } },
    [["usr_ua_cole", 2], ["usr_ua_dev", 1, "received"]], 12);
  post({ id: "pst_meal_tacos", campusId: "ua", kind: "meal", ownerId: "usr_ua_jordan", title: "Birria tacos — Friday batch",
    body: "Consommé included. 3 tacos per portion.", capacity: 12, unitPriceCents: 600, startsAt: t(30),
    imageUrl: "/photos/meal_tacos.jpg", data: { dish: "Birria tacos", dietary: [], pickupSpot: "Downtown Tuscaloosa, off Greensboro Ave", trade: null } },
    [["usr_ua_maya", 2, "sent"], ["usr_ua_priya", 1], ["usr_ua_ana", 1]], 20);
  post({ id: "pst_meal_rice", campusId: "ua", kind: "meal", ownerId: "usr_ua_priya", title: "Veggie fried rice — trade me anything",
    capacity: 6, unitPriceCents: 0, startsAt: t(4), imageUrl: "/photos/meal_friedrice.jpg",
    data: { dish: "Vegetable fried rice", dietary: ["vegetarian"], pickupSpot: "Off campus, Northport", trade: "A dessert, or $3 if you insist" } }, [["usr_ua_jordan"]], 5);
  post({ id: "pst_meal_bread", campusId: "ua", kind: "meal", ownerId: "usr_ua_maya", title: "Banana bread, still warm",
    capacity: 10, unitPriceCents: 200, startsAt: t(3), imageUrl: "/photos/meal_bananabread.jpg",
    data: { dish: "Banana bread slices", dietary: ["vegetarian"], pickupSpot: "Off campus, Alberta neighborhood", trade: null } }, [["usr_ua_cole", 2, "received"]], 2);
  post({ id: "pst_meal_prep", campusId: "ua", kind: "meal", ownerId: "usr_ua_dev", title: "Meal-prep bowls: 5 lunches for the week",
    body: "Chicken, rice, roasted veg, corn salsa. Picked up Sunday, eaten by Friday.", capacity: 3, unitPriceCents: 2500, startsAt: t(50),
    imageUrl: "/photos/meal_prep.jpg", data: { dish: "Meal-prep bowls ×5", dietary: ["high-protein"], pickupSpot: "Off campus, 15th St apartments", trade: null } },
    [["usr_ua_ana", 1, "sent"]], 15);
  post({ id: "pst_meal_rb", campusId: "riverbend", kind: "meal", ownerId: "usr_rb_lena", title: "Pasta bake for the floor",
    capacity: 6, unitPriceCents: 400, startsAt: t(8), imageUrl: null,
    data: { dish: "Pasta bake", dietary: ["vegetarian"], pickupSpot: "Willow Commons", trade: null } }, [], 4);

  // ——— Class swaps ———
  // Maya + Jordan form two-thirds of a CS 201 cycle; the demo student completes it.
  const swaps: SwapRequest[] = [
    { id: "swp_maya", campusId: "ua", userId: "usr_ua_maya", course: "CS 201", haveSection: "001", wantSection: "003", status: "open", cycleId: null, autoAccept: true, createdAt: t(-30) },
    { id: "swp_jordan", campusId: "ua", userId: "usr_ua_jordan", course: "CS 201", haveSection: "003", wantSection: "002", status: "open", cycleId: null, autoAccept: true, createdAt: t(-20) },
    { id: "swp_ana", campusId: "ua", userId: "usr_ua_ana", course: "MATH 125", haveSection: "004", wantSection: "007", status: "matched", cycleId: "cyc_math", autoAccept: false, createdAt: t(-50) },
    { id: "swp_cole", campusId: "ua", userId: "usr_ua_cole", course: "MATH 125", haveSection: "007", wantSection: "004", status: "matched", cycleId: "cyc_math", autoAccept: false, createdAt: t(-40) },
    { id: "swp_priya", campusId: "ua", userId: "usr_ua_priya", course: "EN 102", haveSection: "010", wantSection: "012", status: "open", cycleId: null, autoAccept: false, createdAt: t(-10) },
    { id: "swp_dev", campusId: "ua", userId: "usr_ua_dev", course: "CH 101", haveSection: "020", wantSection: "015", status: "open", cycleId: null, autoAccept: false, createdAt: t(-8) },
  ];
  const cycles: SwapCycle[] = [
    { id: "cyc_math", campusId: "ua", course: "MATH 125", requestIds: ["swp_ana", "swp_cole"], confirmedBy: ["usr_ua_ana", "usr_ua_cole"],
      status: "matched", swapAt: t(16), createdAt: t(-39) },
  ];

  return { handoffs, posts, members, swaps, cycles };
}
