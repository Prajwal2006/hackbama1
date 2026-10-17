/**
 * Deterministic seed data. Times are relative to `now` so auctions are always
 * live / ending soon / closed when the demo starts. IDs are stable.
 * Used by the mock adapter and by `pnpm db:seed` for Neon.
 */
import { buildBankSeed } from "./bank";
import { buildCommunitySeed, type CommunitySeed } from "./community";
import type { BankItem, BankReservation } from "../bank-types";
import type { Bid, Category, Condition, Dib, Listing, Notification, PickupMode, Profile, Save } from "../types";

export const DEMO_STUDENT_ID: Record<string, string> = {
  ua: "usr_ua_demo",
  riverbend: "usr_rb_demo",
};

export type SeedData = {
  profiles: Profile[];
  listings: Listing[];
  bids: Bid[];
  dibs: Dib[];
  saves: Save[];
  notifications: Notification[];
} & CommunitySeed & { bankItems: BankItem[]; bankReservations: BankReservation[] };

type ListingSeed = {
  id: string;
  campus: "ua" | "riverbend";
  seller: string;
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  mode: "fixed" | "free" | "auction";
  price?: number; // dollars, whole numbers keep seeds readable
  pickup: PickupMode;
  spot: string;
  hint?: string;
  ageH: number; // hours since posted
  auction?: {
    start: number;
    increment: number;
    startH: number;
    endH: number;
    reserve?: number;
    buyNow?: number;
    bids: [string, number, number][]; // [bidder, dollars, hours ago]
  };
  status?: Listing["status"];
  /** Seller can hold it until move-in. */
  hold?: boolean;
};

const PEOPLE: [string, "ua" | "riverbend", string][] = [
  ["usr_ua_demo", "ua", "Demo Student"],
  ["usr_ua_maya", "ua", "Maya R."],
  ["usr_ua_jordan", "ua", "Jordan T."],
  ["usr_ua_priya", "ua", "Priya S."],
  ["usr_ua_cole", "ua", "Cole B."],
  ["usr_ua_ana", "ua", "Ana L."],
  ["usr_ua_dev", "ua", "Dev K."],
  ["usr_rb_demo", "riverbend", "Demo Student"],
  ["usr_rb_sam", "riverbend", "Sam O."],
  ["usr_rb_lena", "riverbend", "Lena W."],
  ["usr_rb_theo", "riverbend", "Theo M."],
  ["usr_rb_ivy", "riverbend", "Ivy C."],
];

const LISTINGS: ListingSeed[] = [
  // ——— UA: auctions ———
  {
    id: "lst_ua_fridge_galanz", campus: "ua", seller: "usr_ua_maya",
    title: "Retro pink mini-fridge, 3.1 cu ft", description: "Pastel pink with a little freezer compartment. Defrosted and wiped down. Fits under a lofted bed.",
    category: "fridge", condition: "like_new", mode: "auction", pickup: "scheduled", spot: "ridgecrest", ageH: 30,
    auction: { start: 40, increment: 5, startH: -30, endH: 0.42, reserve: 60, buyNow: 140,
      bids: [["usr_ua_jordan", 40, 26], ["usr_ua_priya", 50, 20], ["usr_ua_demo", 60, 12], ["usr_ua_cole", 75, 3]] },
  },
  {
    id: "lst_ua_tv_tcl", campus: "ua", seller: "usr_ua_jordan",
    title: "TCL 43\" 4K Roku TV + wall mount", description: "Remote included. Small scuff on the back, screen is perfect. Mount hardware in a ziploc.",
    category: "tv", condition: "good", mode: "auction", pickup: "flexible", spot: "presidential", ageH: 50,
    auction: { start: 80, increment: 10, startH: -50, endH: 28, buyNow: 220,
      bids: [["usr_ua_ana", 80, 40], ["usr_ua_dev", 100, 22], ["usr_ua_ana", 115, 9]] },
  },
  {
    id: "lst_ua_futon", hold: true, campus: "ua", seller: "usr_ua_priya",
    title: "Charcoal futon that actually folds flat", description: "Sleeps a guest, seats three. You'll need two people and a car — it does not fit in a Corolla, I tried.",
    category: "furniture", condition: "good", mode: "auction", pickup: "scheduled", spot: "lakeside", ageH: 70,
    auction: { start: 30, increment: 5, startH: -70, endH: 0.85,
      bids: [["usr_ua_cole", 30, 60], ["usr_ua_maya", 35, 33], ["usr_ua_jordan", 45, 10], ["usr_ua_maya", 50, 2]] },
  },
  {
    id: "lst_ua_desk", hold: true, campus: "ua", seller: "usr_ua_cole",
    title: "Standing desk, electric, 48\"", description: "Two memory presets. Goes from couch-potato to lecture-podium in 12 seconds.",
    category: "furniture", condition: "like_new", mode: "auction", pickup: "scheduled", spot: "tutwiler", ageH: 12,
    auction: { start: 90, increment: 10, startH: -12, endH: 60, reserve: 150,
      bids: [["usr_ua_dev", 90, 8], ["usr_ua_priya", 110, 4]] },
  },
  {
    id: "lst_ua_bike", campus: "ua", seller: "usr_ua_dev",
    title: "Single-speed bike, matte black, 54cm", description: "New tires in September. U-lock and key included. Perfect for beating the bus to class.",
    category: "bike", condition: "good", mode: "auction", pickup: "now", spot: "quad", ageH: 96,
    auction: { start: 60, increment: 5, startH: -96, endH: -20,
      bids: [["usr_ua_maya", 60, 90], ["usr_ua_demo", 70, 60], ["usr_ua_jordan", 85, 30]] },
    status: "sold",
  },
  {
    id: "lst_ua_ps5", campus: "ua", seller: "usr_ua_ana",
    title: "Wireless game controller, white", description: "Stick drift? Never heard of her. Works with PC and console. Charging cable included.",
    category: "electronics", condition: "like_new", mode: "auction", pickup: "now", spot: "ferg", ageH: 80,
    auction: { start: 25, increment: 2, startH: -80, endH: -6, reserve: 45,
      bids: [["usr_ua_cole", 25, 70], ["usr_ua_demo", 30, 40]] },
    status: "closed",
  },
  {
    id: "lst_ua_keurig", campus: "ua", seller: "usr_ua_maya",
    title: "Keurig K-Mini + 30 pods", description: "Single-serve, fits on a dresser. Descaled last week. Pods are a mix of dark roasts.",
    category: "kitchen", condition: "good", mode: "auction", pickup: "flexible", spot: "paty", ageH: 20,
    auction: { start: 15, increment: 2, startH: -20, endH: -0.05, bids: [["usr_ua_demo", 15, 10], ["usr_ua_dev", 19, 5]] },
  },
  // ——— UA: fixed ———
  {
    id: "lst_ua_microwave", campus: "ua", seller: "usr_ua_jordan",
    title: "700W microwave, turntable works", description: "Clean inside, I promise. Popcorn button is iconic.",
    category: "microwave", condition: "good", mode: "fixed", price: 25, pickup: "now", spot: "presidential", ageH: 4,
  },
  {
    id: "lst_ua_rug", campus: "ua", seller: "usr_ua_priya",
    title: "5×7 shag rug, crimson & cream", description: "Vacuumed and spot-cleaned. Gameday colors, and it makes a cinderblock room feel like a home.",
    category: "rug", condition: "good", mode: "fixed", price: 35, pickup: "scheduled", spot: "lakeside", ageH: 9,
  },
  {
    id: "lst_ua_lamp", campus: "ua", seller: "usr_ua_ana",
    title: "Arc floor lamp with linen shade", description: "Warm LED bulb included. Dimmer on the cord.",
    category: "lamp", condition: "like_new", mode: "fixed", price: 30, pickup: "flexible", spot: "tutwiler", ageH: 15,
  },
  {
    id: "lst_ua_chem", campus: "ua", seller: "usr_ua_dev",
    title: "CH 101 textbook + solutions manual", description: "Highlighted through chapter 7, then I gave up. Access code unused.",
    category: "textbook", condition: "fair", mode: "fixed", price: 45, pickup: "now", spot: "quad", ageH: 2,
  },
  {
    id: "lst_ua_chair", hold: true, campus: "ua", seller: "usr_ua_cole",
    title: "Mesh desk chair with lumbar support", description: "Height and tilt adjust. One armrest squeaks if you lean dramatically.",
    category: "chair", condition: "good", mode: "fixed", price: 40, pickup: "scheduled", spot: "ridgecrest", ageH: 26,
  },
  {
    id: "lst_ua_bedding", campus: "ua", seller: "usr_ua_maya",
    title: "Twin XL bedding set — duvet, sheets, 2 pillows", description: "Washed and folded. Crisp white. Dorm-sized.",
    category: "bedding", condition: "like_new", mode: "fixed", price: 28, pickup: "flexible", spot: "paty", ageH: 40,
  },
  {
    id: "lst_ua_monitor", campus: "ua", seller: "usr_ua_jordan",
    title: "27\" 1440p monitor, 144Hz", description: "No dead pixels. HDMI + DisplayPort cables included.",
    category: "electronics", condition: "like_new", mode: "fixed", price: 120, pickup: "scheduled", spot: "presidential", ageH: 7,
    status: "reserved",
  },
  {
    id: "lst_ua_shelf", hold: true, campus: "ua", seller: "usr_ua_ana",
    title: "5-tier bookshelf, walnut finish", description: "Disassembles with an allen key (included).",
    category: "furniture", condition: "good", mode: "fixed", price: 20, pickup: "scheduled", spot: "lakeside", ageH: 55,
  },
  {
    id: "lst_ua_kettle", campus: "ua", seller: "usr_ua_demo",
    title: "Gooseneck electric kettle", description: "Pour-over ready, holds temp. Moving home and it won't fit in the suitcase.",
    category: "kitchen", condition: "like_new", mode: "fixed", price: 18, pickup: "scheduled", spot: "lakeside", ageH: 20,
    status: "reserved",
  },
  // ——— UA: free ———
  {
    id: "lst_ua_plant", campus: "ua", seller: "usr_ua_priya",
    title: "Pothos named Gerald (+ pot)", description: "Gerald needs a new home over break. Low light, forgiving, dramatic when thirsty.",
    category: "plant", condition: "good", mode: "free", pickup: "now", spot: "tutwiler", ageH: 1,
  },
  {
    id: "lst_ua_hangers", campus: "ua", seller: "usr_ua_cole",
    title: "Bin of 40 hangers + over-door hooks", description: "Free to whoever shows up first with a bag.",
    category: "other", condition: "good", mode: "free", pickup: "now", spot: "ridgecrest", ageH: 3,
  },
  {
    id: "lst_ua_kitchen", campus: "ua", seller: "usr_ua_dev",
    title: "Starter kitchen box: pan, pot, utensils", description: "Everything you need for ramen with ambition.",
    category: "kitchen", condition: "fair", mode: "free", pickup: "flexible", spot: "bryce-lot", ageH: 18,
  },
  {
    id: "lst_ua_minifridge2", hold: true, campus: "ua", seller: "usr_ua_ana",
    title: "Compact 1.7 cu ft fridge — free if you haul it", description: "Works fine, just loud-ish. Good for drinks.",
    category: "fridge", condition: "fair", mode: "free", pickup: "scheduled", spot: "presidential", ageH: 11,
  },
  // ——— Riverbend (demo): auctions ———
  {
    id: "lst_rb_fridge", campus: "riverbend", seller: "usr_rb_sam",
    title: "Stainless mini-fridge with real freezer", description: "Separate freezer door — ice cubes are back on the menu.",
    category: "fridge", condition: "like_new", mode: "auction", pickup: "scheduled", spot: "north-tower", ageH: 22,
    auction: { start: 50, increment: 5, startH: -22, endH: 0.7, buyNow: 150,
      bids: [["usr_rb_lena", 50, 18], ["usr_rb_theo", 60, 10], ["usr_rb_lena", 70, 3]] },
  },
  {
    id: "lst_rb_speaker", campus: "riverbend", seller: "usr_rb_theo",
    title: "Bluetooth bookshelf speakers (pair)", description: "Punchy bass, aux and optical in. Roommate-tested volume.",
    category: "electronics", condition: "good", mode: "auction", pickup: "flexible", spot: "union", ageH: 35,
    auction: { start: 35, increment: 5, startH: -35, endH: 40, bids: [["usr_rb_ivy", 35, 30]] },
  },
  {
    id: "lst_rb_kayak", campus: "riverbend", seller: "usr_rb_ivy",
    title: "Inflatable kayak + paddle", description: "Used four times on the river. Patch kit included, never needed it.",
    category: "other", condition: "like_new", mode: "auction", pickup: "scheduled", spot: "boathouse", ageH: 60,
    auction: { start: 70, increment: 10, startH: -60, endH: -12, reserve: 90,
      bids: [["usr_rb_sam", 70, 50], ["usr_rb_demo", 80, 30], ["usr_rb_lena", 100, 15]] },
    status: "sold",
  },
  // ——— Riverbend: fixed ———
  {
    id: "lst_rb_couch", hold: true, campus: "riverbend", seller: "usr_rb_lena",
    title: "Loveseat, mustard velvet", description: "Statement piece. Pet-free, smoke-free, drama-free.",
    category: "furniture", condition: "good", mode: "fixed", price: 85, pickup: "scheduled", spot: "willow", ageH: 6,
  },
  {
    id: "lst_rb_lamp", campus: "riverbend", seller: "usr_rb_sam",
    title: "Pink desk lamp, bendy neck", description: "Adjustable neck, warm LED bulb included. Small enough for a bunk shelf.",
    category: "lamp", condition: "good", mode: "fixed", price: 12, pickup: "now", spot: "north-tower", ageH: 14,
  },
  {
    id: "lst_rb_micro", campus: "riverbend", seller: "usr_rb_theo",
    title: "Microwave/air-fryer combo", description: "The upgrade your dorm deserves. Crisps leftover pizza perfectly.",
    category: "microwave", condition: "like_new", mode: "fixed", price: 60, pickup: "flexible", spot: "union", ageH: 28,
  },
  {
    id: "lst_rb_books", campus: "riverbend", seller: "usr_rb_ivy",
    title: "Intro Psych + Stats textbook bundle", description: "Both current editions. Light pencil notes.",
    category: "textbook", condition: "good", mode: "fixed", price: 50, pickup: "now", spot: "union", ageH: 44,
  },
  {
    id: "lst_rb_rug", campus: "riverbend", seller: "usr_rb_lena",
    title: "Washable runner rug, geometric", description: "Machine washable. Brightens a hallway instantly.",
    category: "rug", condition: "like_new", mode: "fixed", price: 22, pickup: "flexible", spot: "willow", ageH: 19,
  },
  // ——— Riverbend: free ———
  {
    id: "lst_rb_monstera", campus: "riverbend", seller: "usr_rb_ivy",
    title: "Baby monstera cutting in a jar", description: "Rooted and ready. Free plant energy.",
    category: "plant", condition: "new", mode: "free", pickup: "now", spot: "boathouse", ageH: 2,
  },
  {
    id: "lst_rb_chair", campus: "riverbend", seller: "usr_rb_theo",
    title: "Wooden accent chair", description: "Solid and comfy enough for game nights. Come grab it.",
    category: "chair", condition: "fair", mode: "free", pickup: "now", spot: "lot-c", ageH: 8,
  },
  {
    id: "lst_rb_bedding", campus: "riverbend", seller: "usr_rb_sam",
    title: "Mattress topper, twin XL, 2\"", description: "Memory foam. Vacuum-sealed and clean.",
    category: "bedding", condition: "good", mode: "free", pickup: "scheduled", spot: "north-tower", ageH: 30,
  },
];

const H = 3_600_000;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function buildSeed(now: Date = new Date()): SeedData {
  const t = (hours: number) => new Date(now.getTime() + hours * H);
  const profiles: Profile[] = PEOPLE.map(([id, campusId, displayName], i) => ({
    id,
    campusId,
    displayName,
    email: null,
    avatarUrl: null,
    verifiedAt: t(-200 - i * 5),
    createdAt: t(-400 - i * 5),
    updatedAt: t(-200 - i * 5),
  }));

  const listings: Listing[] = [];
  const bids: Bid[] = [];

  for (const s of LISTINGS) {
    const created = t(-s.ageH);
    const isAuction = s.mode === "auction" && s.auction;
    const listingBids: Bid[] = [];
    if (isAuction) {
      s.auction!.bids.forEach(([bidder, dollars, ago], i) => {
        listingBids.push({
          id: `bid_${s.id.slice(4)}_${i + 1}`,
          campusId: s.campus,
          listingId: s.id,
          bidderId: bidder,
          amountCents: dollars * 100,
          status: "outbid",
          idempotencyKey: null,
          createdAt: t(-ago),
          updatedAt: t(-ago),
        });
      });
      if (listingBids.length) listingBids[listingBids.length - 1].status = "active";
    }
    const settled = s.status === "sold" || s.status === "closed";
    const top = listingBids[listingBids.length - 1] ?? null;
    if (isAuction && settled) {
      for (const b of listingBids) b.status = s.status === "sold" && b === top ? "winning" : "outbid";
    }
    bids.push(...listingBids);

    listings.push({
      id: s.id,
      campusId: s.campus,
      sellerId: s.seller,
      title: s.title,
      description: s.description,
      category: s.category,
      condition: s.condition,
      saleMode: s.mode,
      priceCents: s.mode === "free" ? 0 : isAuction ? (top?.amountCents ?? s.auction!.start * 100) : (s.price ?? 0) * 100,
      isFree: s.mode === "free",
      currency: "USD",
      imageUrls: [`/photos/${s.id}.jpg`],
      status: s.status ?? "active",
      pickupMode: s.pickup,
      handoffStart: s.pickup === "scheduled" ? t(20) : null,
      handoffEnd: s.pickup === "scheduled" ? t(23) : null,
      locationHint: s.hint ?? null,
      pickupSpotId: s.spot,
      holdForMoveIn: s.hold ?? false,
      artSeed: hash(s.id) % 360,
      auction: isAuction
        ? {
            startingBidCents: s.auction!.start * 100,
            minimumIncrementCents: s.auction!.increment * 100,
            auctionStartsAt: t(s.auction!.startH),
            auctionEndsAt: t(s.auction!.endH),
            reservePriceCents: s.auction!.reserve ? s.auction!.reserve * 100 : null,
            buyNowPriceCents: s.auction!.buyNow ? s.auction!.buyNow * 100 : null,
            settledAt: settled ? t(s.auction!.endH + 0.01) : null,
            outcome: s.status === "sold" ? "won" : s.status === "closed" ? (top ? "reserve_not_met" : "no_bids") : null,
            winningBidId: s.status === "sold" ? (top?.id ?? null) : null,
          }
        : null,
      createdAt: created,
      updatedAt: created,
    });
  }

  const dibs: Dib[] = [
    {
      id: "dib_ua_kettle",
      campusId: "ua",
      listingId: "lst_ua_kettle",
      buyerId: "usr_ua_maya",
      status: "active",
      expiresAt: t(30),
      createdAt: t(-3),
      updatedAt: t(-3),
    },
    {
      id: "dib_ua_monitor",
      campusId: "ua",
      listingId: "lst_ua_monitor",
      buyerId: "usr_ua_demo",
      status: "active",
      expiresAt: t(19),
      createdAt: t(-5),
      updatedAt: t(-5),
    },
  ];

  const saves: Save[] = [
    { id: "sav_1", campusId: "ua", listingId: "lst_ua_tv_tcl", userId: "usr_ua_demo", createdAt: t(-10) },
    { id: "sav_2", campusId: "ua", listingId: "lst_ua_lamp", userId: "usr_ua_demo", createdAt: t(-8) },
    { id: "sav_3", campusId: "ua", listingId: "lst_ua_fridge_galanz", userId: "usr_ua_jordan", createdAt: t(-20) },
    { id: "sav_4", campusId: "ua", listingId: "lst_ua_fridge_galanz", userId: "usr_ua_ana", createdAt: t(-15) },
    { id: "sav_5", campusId: "ua", listingId: "lst_ua_futon", userId: "usr_ua_dev", createdAt: t(-11) },
    { id: "sav_6", campusId: "riverbend", listingId: "lst_rb_couch", userId: "usr_rb_demo", createdAt: t(-3) },
    { id: "sav_7", campusId: "riverbend", listingId: "lst_rb_fridge", userId: "usr_rb_ivy", createdAt: t(-6) },
  ];

  const notifications: Notification[] = [
    {
      id: "ntf_ua_1", campusId: "ua", userId: "usr_ua_demo", kind: "outbid",
      title: "You've been outbid", body: "Someone bid $75.00 on the retro pink mini-fridge.",
      listingId: "lst_ua_fridge_galanz", readAt: null, createdAt: t(-3),
    },
    {
      id: "ntf_ua_2", campusId: "ua", userId: "usr_ua_demo", kind: "dibs_confirmed",
      title: "Dibs locked in", body: "The 27\" monitor is held for you for 24 hours.",
      listingId: "lst_ua_monitor", readAt: t(-4), createdAt: t(-5),
    },
    {
      id: "ntf_ua_3", campusId: "ua", userId: "usr_ua_demo", kind: "auction_lost",
      title: "Auction ended", body: "The single-speed bike went to another bidder at $85.00.",
      listingId: "lst_ua_bike", readAt: t(-18), createdAt: t(-20),
    },
    {
      id: "ntf_rb_1", campusId: "riverbend", userId: "usr_rb_demo", kind: "auction_lost",
      title: "Auction ended", body: "The inflatable kayak sold for $100.00.",
      listingId: "lst_rb_kayak", readAt: null, createdAt: t(-12),
    },
  ];

  notifications.push({
    id: "ntf_ua_4", campusId: "ua", userId: "usr_ua_demo", kind: "dibs_received",
    title: "Maya called dibs!", body: "Your gooseneck kettle is reserved. Maya says she sent $18 on Venmo.",
    listingId: "lst_ua_kettle", readAt: null, createdAt: t(-1),
  });
  return { profiles, listings, bids, dibs, saves, notifications, ...buildCommunitySeed(now, listings), ...buildBankSeed(now) };
}
