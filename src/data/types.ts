/**
 * Domain types shared by every adapter and the UI. Adapters map their storage
 * representation to these shapes; components never see Drizzle rows.
 * All money is integer cents.
 */

export const CATEGORIES = [
  "fridge",
  "microwave",
  "furniture",
  "chair",
  "lamp",
  "rug",
  "tv",
  "electronics",
  "bedding",
  "textbook",
  "plant",
  "bike",
  "kitchen",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  fridge: "Mini-fridges",
  microwave: "Microwaves",
  furniture: "Furniture",
  chair: "Chairs",
  lamp: "Lamps",
  rug: "Rugs",
  tv: "TVs",
  electronics: "Electronics",
  bedding: "Bedding",
  textbook: "Textbooks",
  plant: "Plants",
  bike: "Bikes",
  kitchen: "Kitchen",
  other: "Other",
};

export const CONDITIONS = ["new", "like_new", "good", "fair", "well_loved"] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_LABEL: Record<Condition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  well_loved: "Well-loved",
};

export const SALE_MODES = ["fixed", "auction", "free"] as const;
export type SaleMode = (typeof SALE_MODES)[number];

export const PICKUP_MODES = ["now", "scheduled", "flexible"] as const;
export type PickupMode = (typeof PICKUP_MODES)[number];
export const PICKUP_LABEL: Record<PickupMode, string> = {
  now: "Pick up today",
  scheduled: "Scheduled handoff",
  flexible: "Flexible",
};

/**
 * active    — open for dibs / bids
 * reserved  — a dibs hold is in place (fixed / free)
 * sold      — handed off / auction won / bought now
 * closed    — auction ended without a sale (no bids or reserve not met)
 * cancelled — seller withdrew it
 */
export type ListingStatus = "active" | "reserved" | "sold" | "closed" | "cancelled";

export type AuctionOutcome = "won" | "reserve_not_met" | "no_bids" | "bought_now";

export type Profile = {
  id: string;
  campusId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuctionFields = {
  startingBidCents: number;
  minimumIncrementCents: number;
  auctionStartsAt: Date;
  auctionEndsAt: Date;
  reservePriceCents: number | null;
  buyNowPriceCents: number | null;
  settledAt: Date | null;
  outcome: AuctionOutcome | null;
  winningBidId: string | null;
};

export type Listing = {
  id: string;
  campusId: string;
  sellerId: string;
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  saleMode: SaleMode;
  /** Fixed price; 0 for free; for auctions mirrors the current visible price. */
  priceCents: number;
  isFree: boolean;
  currency: "USD";
  imageUrls: string[];
  status: ListingStatus;
  pickupMode: PickupMode;
  handoffStart: Date | null;
  handoffEnd: Date | null;
  locationHint: string | null;
  pickupSpotId: string | null;
  /** Deterministic hue used by generated illustrations. */
  artSeed: number;
  auction: AuctionFields | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BidStatus = "active" | "outbid" | "winning" | "withdrawn" | "rejected";

export type Bid = {
  id: string;
  campusId: string;
  listingId: string;
  bidderId: string;
  amountCents: number;
  status: BidStatus;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DibStatus = "active" | "completed" | "expired" | "cancelled";

export type Dib = {
  id: string;
  campusId: string;
  listingId: string;
  buyerId: string;
  status: DibStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Save = {
  id: string;
  campusId: string;
  listingId: string;
  userId: string;
  createdAt: Date;
};

export type NotificationKind =
  | "outbid"
  | "auction_won"
  | "auction_lost"
  | "auction_sold"
  | "auction_unsold"
  | "dibs_confirmed"
  | "dibs_received"
  | "dibs_expired"
  | "bid_received";

export type Notification = {
  id: string;
  campusId: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  listingId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** Listing joined with what list/detail views need. */
export type ListingView = Listing & {
  seller: Pick<Profile, "id" | "displayName" | "avatarUrl" | "verifiedAt">;
  bidCount: number;
  highestBidCents: number | null;
  saveCount: number;
};

export type ListingSort = "newest" | "price_asc" | "price_desc" | "ending_soon" | "popular";

export type ListingFilter = {
  campusIds: string[];
  q?: string;
  category?: Category;
  saleMode?: SaleMode;
  pickupMode?: PickupMode;
  pickupSpotId?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  freeOnly?: boolean;
  /** Defaults to ["active", "reserved"]. */
  statuses?: ListingStatus[];
  sellerId?: string;
  sort?: ListingSort;
  limit?: number;
};

export type CampusStats = {
  activeListings: number;
  freeItems: number;
  liveAuctions: number;
  dibsCalled: number;
  bidsPlaced: number;
  savedCents: number;
};
